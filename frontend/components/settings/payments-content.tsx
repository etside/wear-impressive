'use client';
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Settings, Unplug, X, Wallet, Truck, Percent, CreditCard } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { paymentMethodsApi, settingsApi } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";
import { Price } from "@/lib/format-price";
import { ManualPaymentPanel } from "@/components/settings/manual-payment-panel";
import type { PaymentMethod } from "@/lib/api/types";

type AdvanceMode = 'none' | 'delivery_charge' | 'percentage' | 'full';
type RoundTo = 1 | 10 | 50;

const ADVANCE_MODES: { key: AdvanceMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'none',             label: 'Full COD',                desc: 'Customer pays nothing upfront. Full amount on delivery.',  icon: <Wallet size={18} /> },
  { key: 'delivery_charge',  label: 'Delivery charge only',    desc: 'Customer prepays only the shipping fee. Rest is COD.',     icon: <Truck size={18} /> },
  { key: 'percentage',       label: 'Percentage advance',      desc: 'Customer prepays a % of the product amount. Rest is COD.', icon: <Percent size={18} /> },
  { key: 'full',             label: 'Full prepayment',         desc: 'Customer pays the entire amount upfront. No COD.',         icon: <CreditCard size={18} /> },
];

const gatewayColors = [
  "bg-pink-500",
  "bg-orange-500",
  "bg-blue-600",
  "bg-gray-800",
  "bg-green-600",
  "bg-purple-600",
];

interface ConfigureModalState {
  method: PaymentMethod;
  settings: Record<string, string>;
}

export function PaymentsContent() {
  const { t } = useLang();
  const d = t.dashPayments;
  const queryClient = useQueryClient();

  const [configure, setConfigure] = useState<ConfigureModalState | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['vendor', 'settings', 'payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  /* ── Advance Payment Policy ────────────────────────────────── */
  const settingsQuery = useQuery({
    queryKey: ['vendor', 'settings', 'all'],
    queryFn: () => settingsApi.get(),
  });

  const [advMode, setAdvMode] = useState<AdvanceMode>('none');
  const [advPercent, setAdvPercent] = useState(30);
  const [advRoundTo, setAdvRoundTo] = useState<RoundTo>(50);
  const [advFloor, setAdvFloor] = useState(50);

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    const mode = String(s['payment.advance_mode'] ?? 'none');
    if (['none', 'delivery_charge', 'percentage', 'full'].includes(mode)) {
      setAdvMode(mode as AdvanceMode);
    }
    setAdvPercent(Math.max(1, Math.min(99, Number(s['payment.advance_percentage'] ?? 30))));
    const r = Number(s['payment.advance_round_to'] ?? 50);
    setAdvRoundTo(([1, 10, 50] as RoundTo[]).includes(r as RoundTo) ? (r as RoundTo) : 50);
    setAdvFloor(Math.max(0, Number(s['payment.advance_floor'] ?? 50)));
  }, [settingsQuery.data]);

  // The vendor needs SOMETHING to actually collect the advance through.
  // Hard-block the save when advance is on but the manual gateway is off.
  const manualEnabled = methods.some(
    (m) => (m.provider === 'manual' || m.name === 'manual') && m.is_active,
  );
  const advanceRequiresManual = advMode !== 'none';
  const advanceBlockedReason =
    advanceRequiresManual && !manualEnabled
      ? 'Enable the Manual (bKash/Nagad/Rocket) gateway below to collect the advance amount.'
      : null;

  // Live preview math — mirrors AdvancePolicyService::compute on the server.
  const preview = useMemo(() => {
    const subtotal = 1500;
    const shipping = 80;
    const total = subtotal + shipping;
    let advance = 0;
    if (advMode === 'delivery_charge') advance = shipping;
    else if (advMode === 'percentage') advance = subtotal * (advPercent / 100);
    else if (advMode === 'full') advance = total;
    if (advRoundTo > 1) advance = Math.floor(advance / advRoundTo) * advRoundTo;
    else advance = Math.round(advance);
    if (advance > 0 && advance < advFloor) advance = 0;
    if (advance > total) advance = total;
    return { subtotal, shipping, total, advance, cod: Math.max(0, total - advance) };
  }, [advMode, advPercent, advRoundTo, advFloor]);

  const advanceMutation = useMutation({
    mutationFn: () =>
      settingsApi.update({
        settings: [
          { key: 'payment.advance_mode',       value: advMode,                            group: 'payments' },
          { key: 'payment.advance_percentage', value: advPercent,    type: 'integer',     group: 'payments' },
          { key: 'payment.advance_round_to',   value: advRoundTo,    type: 'integer',     group: 'payments' },
          { key: 'payment.advance_floor',      value: advFloor,      type: 'integer',     group: 'payments' },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      // Storefront /calculate must re-run with the new policy.
      queryClient.invalidateQueries({ queryKey: ['storefront', 'checkout', 'calculate'] });
      showBanner('success', 'Advance payment policy saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save policy')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof paymentMethodsApi.update>[1] }) =>
      paymentMethodsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'payment-methods'] });
      setConfigure(null);
      showBanner('success', 'Payment method saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save')),
  });

  const toggleActive = (m: PaymentMethod) => {
    updateMutation.mutate({ id: m.id, payload: { is_active: !m.is_active } });
  };

  const openConfigure = (m: PaymentMethod) => {
    const settings: Record<string, string> = {};
    if (m.settings) {
      Object.entries(m.settings).forEach(([k, v]) => { settings[k] = typeof v === 'string' ? v : ''; });
    }
    setConfigure({ method: m, settings });
  };

  const saveConfigure = () => {
    if (!configure) return;
    updateMutation.mutate({
      id: configure.method.id,
      payload: { settings: configure.settings, is_active: true },
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {[d.gateways, d.payouts].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              i === 0 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {banner && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      {/* Advance Payment Policy ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Advance Payment Policy</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Decide how much the customer pays upfront via bKash/Nagad/Rocket. The rest is collected by the courier as COD.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADVANCE_MODES.map((m) => {
            const active = advMode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setAdvMode(m.key)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {m.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {advMode === 'percentage' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Advance percentage</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1} max={99}
                  value={advPercent}
                  onChange={(e) => setAdvPercent(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  className="w-20 h-10 px-3 text-sm text-center border border-gray-200 rounded-lg outline-none focus:border-gray-400"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400 ml-2">of (subtotal − discount)</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Round to</label>
              <select
                value={advRoundTo}
                onChange={(e) => setAdvRoundTo(Number(e.target.value) as RoundTo)}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              >
                <option value={1}>Exact</option>
                <option value={10}>Nearest ৳10</option>
                <option value={50}>Nearest ৳50</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Minimum advance</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">৳</span>
                <input
                  type="number"
                  min={0}
                  value={advFloor}
                  onChange={(e) => setAdvFloor(Math.max(0, Number(e.target.value) || 0))}
                  className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Below this, the order falls back to full COD.</p>
            </div>
          </div>
        )}

        {/* Live example */}
        {advMode !== 'none' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Example</p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
              On a <Price value={preview.subtotal} /> order with <Price value={preview.shipping} /> shipping (total{' '}
              <Price value={preview.total} />), the customer would pay{' '}
              <b className="text-gray-900"><Price value={preview.advance} /></b> upfront via bKash/Nagad and{' '}
              <b className="text-gray-900"><Price value={preview.cod} /></b> on delivery.
            </div>
          </div>
        )}

        {advanceBlockedReason && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {advanceBlockedReason}
          </div>
        )}

        {advMode !== 'none' && !advanceBlockedReason && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Heads-up: while this policy is active, <b>Cash on Delivery is hidden from checkout</b>. Customers must prepay the advance via bKash/Nagad/Rocket — that&apos;s the whole point of the policy.
          </div>
        )}

        <div className="flex justify-end mt-5">
          <Button
            size="sm"
            onClick={() => advanceMutation.mutate()}
            disabled={advanceMutation.isPending || !!advanceBlockedReason}
          >
            {advanceMutation.isPending ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </div>

      {/* Manual mobile-banking gateway editor (bKash / Nagad / Rocket).
          Lives here because that's where the advance-policy depends on it. */}
      <ManualPaymentPanel />

      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading payment methods...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {methods.map((method, i) => {
            const connected = method.is_active;
            return (
              <div key={method.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${gatewayColors[i % gatewayColors.length]} flex items-center justify-center`}>
                      <span className="text-white font-bold text-xs text-center leading-tight px-1">
                        {(method.name ?? method.display_name ?? '').split(" ").map(w => w[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{(method.name ?? method.display_name ?? '')}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{method.description ?? ''}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {connected
                      ? <CheckCircle2 size={14} className="text-green-500" />
                      : <Circle size={14} className="text-gray-400" />
                    }
                    <Badge variant={connected ? "success" : "default"}>
                      {connected ? d.labels.connected : d.labels.notConnected}
                    </Badge>
                  </div>

                  {connected ? (
                    <div className="flex gap-1">
                      <Button variant="secondary" size="xs" onClick={() => openConfigure(method)}>
                        <Settings size={12} /> {d.labels.configure}
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => toggleActive(method)}>
                        <Unplug size={12} />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="primary" size="xs" onClick={() => openConfigure(method)}>
                      {d.labels.connect}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payout info */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Payouts are processed automatically</p>
            <p className="text-xs text-blue-600 mt-1">
              bKash and Nagad payouts are processed within 24 hours. Bank transfers take 2–3 business days.
            </p>
          </div>
        </div>
      </div>

      {/* Configure modal */}
      {configure && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Configure {configure.method.name ?? configure.method.display_name ?? ''}</h3>
              <button onClick={() => setConfigure(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {Object.keys(configure.settings).length === 0 && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="API Key"
                    onChange={e => setConfigure(c => c ? { ...c, settings: { ...c.settings, api_key: e.target.value } } : null)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                  <input
                    type="password"
                    placeholder="API Secret"
                    onChange={e => setConfigure(c => c ? { ...c, settings: { ...c.settings, api_secret: e.target.value } } : null)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                </div>
              )}
              {Object.entries(configure.settings).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                  <input
                    type={key.includes('secret') || key.includes('password') ? 'password' : 'text'}
                    value={val}
                    onChange={e => setConfigure(c => c ? { ...c, settings: { ...c.settings, [key]: e.target.value } } : null)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setConfigure(null)} disabled={updateMutation.isPending}>Cancel</Button>
              <Button size="sm" onClick={saveConfigure} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
