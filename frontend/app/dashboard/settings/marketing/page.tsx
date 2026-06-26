'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { metaPixelApi } from '@/lib/api/services/vendor-settings';
import { getApiErrorMessage } from '@/lib/api/client';
import { CheckCircle, AlertTriangle, Eye, ShoppingCart, CreditCard, Package, Key, Trash2 } from 'lucide-react';

export default function MetaPixelSettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['vendor', 'settings', 'meta-pixel'],
    queryFn: () => metaPixelApi.get(),
  });

  const [form, setForm] = useState<{
    pixel_id: string;
    is_active: boolean;
    track_view_content: boolean;
    track_add_to_cart: boolean;
    track_initiate_checkout: boolean;
    track_purchase: boolean;
    use_conversions_api: boolean;
  }>({
    pixel_id: '',
    is_active: false,
    track_view_content: true,
    track_add_to_cart: true,
    track_initiate_checkout: true,
    track_purchase: true,
    use_conversions_api: false,
  });

  // Sync form when data loads
  useState(() => {
    if (settings) {
      setForm({
        pixel_id: settings.pixel_id ?? '',
        is_active: settings.is_active,
        track_view_content: settings.track_view_content,
        track_add_to_cart: settings.track_add_to_cart,
        track_initiate_checkout: settings.track_initiate_checkout,
        track_purchase: settings.track_purchase,
        use_conversions_api: settings.use_conversions_api,
      });
      setTestEventCode(settings.test_event_code ?? '');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => metaPixelApi.update(data),
    onSuccess: () => {
      setSaved(true);
      setError('');
      setAccessToken('');
      qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'meta-pixel'] });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to save settings')),
  });

  const clearTokenMutation = useMutation({
    mutationFn: () => metaPixelApi.clearToken(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'meta-pixel'] }),
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to remove token')),
  });

  const handleSave = () => {
    const payload: any = { ...form, test_event_code: testEventCode || null };
    if (accessToken.trim()) payload.access_token = accessToken.trim();
    updateMutation.mutate(payload);
  };

  // Update form when settings load (useEffect-equivalent via query onSuccess)
  if (settings && form.pixel_id === '' && settings.pixel_id) {
    setForm({
      pixel_id: settings.pixel_id ?? '',
      is_active: settings.is_active,
      track_view_content: settings.track_view_content,
      track_add_to_cart: settings.track_add_to_cart,
      track_initiate_checkout: settings.track_initiate_checkout,
      track_purchase: settings.track_purchase,
      use_conversions_api: settings.use_conversions_api,
    });
    setTestEventCode(settings.test_event_code ?? '');
  }

  const toggle = (key: keyof typeof form) => setForm(f => ({ ...f, [key]: !f[key] }));

  const eventTracks = [
    { key: 'track_view_content' as const, label: 'ViewContent', desc: 'Product page views', Icon: Eye },
    { key: 'track_add_to_cart' as const, label: 'AddToCart', desc: 'Add to cart events', Icon: ShoppingCart },
    { key: 'track_initiate_checkout' as const, label: 'InitiateCheckout', desc: 'Checkout page views', Icon: CreditCard },
    { key: 'track_purchase' as const, label: 'Purchase', desc: 'Completed orders', Icon: Package },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Meta Pixel"
        subtitle="Connect your Facebook/Meta Pixel for ad tracking and Conversions API."
      />

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      {!isLoading && (
        <>
          {/* Pixel ID + Active toggle */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable Meta Pixel</p>
                <p className="text-xs text-gray-500 mt-0.5">Inject the pixel script on all storefront pages</p>
              </div>
              <ToggleSwitch checked={form.is_active} onChange={() => toggle('is_active')} />
            </div>

            <Input
              label="Pixel ID"
              placeholder="123456789012345"
              value={form.pixel_id}
              onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))}
              hint="Found in Meta Events Manager → Data Sources"
            />
          </div>

          {/* Event tracking toggles */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Events to Track</p>
            <div className="space-y-3">
              {eventTracks.map(({ key, label, desc, Icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon size={14} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={form[key]} onChange={() => toggle(key)} />
                </div>
              ))}
            </div>
          </div>

          {/* Conversions API */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Conversions API (CAPI)</p>
                <p className="text-xs text-gray-500 mt-0.5">Server-side event forwarding — improves accuracy and bypasses ad blockers</p>
              </div>
              <ToggleSwitch checked={form.use_conversions_api} onChange={() => toggle('use_conversions_api')} />
            </div>

            {form.use_conversions_api && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Key size={12} /> Access Token
                    {settings?.has_access_token && (
                      <span className="text-green-600 font-normal">(saved)</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                      placeholder={settings?.has_access_token ? '••••••••  (leave blank to keep existing)' : 'Paste your CAPI access token'}
                      className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none font-mono"
                    />
                    {settings?.has_access_token && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => clearTokenMutation.mutate()}
                        disabled={clearTokenMutation.isPending}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Events Manager → Settings → Conversions API → Generate access token</p>
                </div>

                <Input
                  label="Test Event Code (optional)"
                  placeholder="TEST12345"
                  value={testEventCode}
                  onChange={e => setTestEventCode(e.target.value)}
                  hint="Use during testing to verify events in Meta Events Manager without affecting delivery"
                />
              </div>
            )}
          </div>

          {/* Status / warnings */}
          {form.is_active && !form.pixel_id.trim() && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">Pixel is enabled but Pixel ID is empty — no tracking will occur until you add an ID.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={14} className="text-green-600 shrink-0" />
              <p className="text-xs text-green-700">Settings saved successfully.</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
            {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </>
      )}
    </div>
  );
}
