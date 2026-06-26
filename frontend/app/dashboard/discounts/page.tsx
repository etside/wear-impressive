'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Plus, Search, Pencil, Trash2, Tag, X, Check, Calendar,
  Percent, DollarSign, Users, AlertCircle, Copy, ToggleLeft, ToggleRight
} from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { discountsApi, type DiscountCreatePayload } from "@/lib/api/services/vendor-marketing";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Discount } from "@/lib/api/types";

interface CouponFormState {
  code: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  minimumAmount: number;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  appliesToAll: boolean;
}

const defaultCoupon: CouponFormState = {
  code: '',
  name: '',
  type: 'percentage',
  value: 0,
  minimumAmount: 0,
  maximumDiscount: null,
  usageLimit: null,
  usagePerCustomer: null,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  isActive: true,
  appliesToAll: true,
};

function fromApiDiscount(d: Discount): CouponFormState {
  return {
    code: d.code,
    name: d.name ?? '',
    type: d.type === 'percentage' ? 'percentage' : 'fixed',
    value: parseFloat(d.value) || 0,
    minimumAmount: d.minimum_amount ? parseFloat(d.minimum_amount) : 0,
    maximumDiscount: d.maximum_discount ? parseFloat(d.maximum_discount) : null,
    usageLimit: d.usage_limit,
    usagePerCustomer: d.usage_limit_per_customer,
    startDate: d.start_date ? d.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: d.end_date ? d.end_date.split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isActive: d.is_active,
    appliesToAll: d.applies_to === 'all',
  };
}

function toApiPayload(form: CouponFormState): DiscountCreatePayload {
  return {
    code: form.code,
    name: form.name || null,
    type: form.type === 'percentage' ? 'percentage' : 'fixed',
    value: form.value,
    minimum_amount: form.minimumAmount > 0 ? form.minimumAmount : null,
    maximum_discount: form.maximumDiscount,
    applies_to: form.appliesToAll ? 'all' : 'products',
    usage_limit: form.usageLimit,
    usage_limit_per_customer: form.usagePerCustomer,
    start_date: form.startDate ? form.startDate : null,
    end_date: form.endDate ? form.endDate : null,
    is_active: form.isActive,
  };
}

function CouponFormModal({ coupon, onClose, onSave, saving }: {
  coupon?: Discount;
  onClose: () => void;
  onSave: (data: CouponFormState) => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState<CouponFormState>(
    coupon ? fromApiDiscount(coupon) : defaultCoupon
  );

  const set = (key: keyof CouponFormState, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const previewAmount = 1000;
  const preview = form.type === 'percentage'
    ? Math.min(previewAmount * form.value / 100, form.maximumDiscount ?? Infinity)
    : form.value;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900">{coupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Coupon Code *</label>
              <input type="text" value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="e.g. EID2026"
                className="w-full h-10 px-3 text-sm font-mono font-bold uppercase border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Letters and numbers only, no spaces</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Internal Name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Eid Festival Sale"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Discount type & value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Discount Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {(['percentage', 'fixed'] as const).map(type => (
                <button key={type} onClick={() => set('type', type)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    form.type === type ? 'border-black bg-black/[0.02]' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {type === 'percentage' ? <Percent size={16} className={form.type === type ? 'text-black' : 'text-gray-400'} />
                    : <DollarSign size={16} className={form.type === type ? 'text-black' : 'text-gray-400'} />}
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (৳)'}</p>
                    <p className="text-[11px] text-gray-400">{type === 'percentage' ? 'e.g. 20% off' : 'e.g. ৳100 off'}</p>
                  </div>
                  {form.type === type && <Check size={14} className="ml-auto text-black shrink-0" />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {form.type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (৳)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {form.type === 'percentage' ? '%' : '৳'}
                  </span>
                  <input type="number" min="0" max={form.type === 'percentage' ? 100 : undefined}
                    value={form.value || ''} onChange={e => set('value', parseFloat(e.target.value) || 0)}
                    placeholder={form.type === 'percentage' ? '20' : '100'}
                    className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                </div>
              </div>
              {form.type === 'percentage' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Discount Cap (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                    <input type="number" min="0"
                      value={form.maximumDiscount ?? ''} onChange={e => set('maximumDiscount', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="No cap"
                      className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Leave empty for no cap</p>
                </div>
              )}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Conditions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Minimum Order Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                  <input type="number" min="0" value={form.minimumAmount || ''}
                    onChange={e => set('minimumAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0 (no minimum)"
                    className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Usage limits */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Users size={13} /> Usage Limits
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Total Usage Limit</label>
                <input type="number" min="0" value={form.usageLimit ?? ''}
                  onChange={e => set('usageLimit', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                <p className="text-[11px] text-gray-400 mt-1">Empty = unlimited</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Limit Per Customer</label>
                <input type="number" min="0" value={form.usagePerCustomer ?? ''}
                  onChange={e => set('usagePerCustomer', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
            </div>
          </div>

          {/* Date range */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Calendar size={13} /> Active Period
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">End Date</label>
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.value > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Discount Preview (on ৳{previewAmount.toLocaleString()} order)</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Discount applied:</span>
                <span className="text-lg font-bold text-green-600">−৳{Math.round(preview).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600">Customer pays:</span>
                <span className="text-base font-semibold text-gray-900">৳{Math.round(previewAmount - preview).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Status toggle */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-900">Active Status</p>
              <p className="text-[11px] text-gray-400">Inactive coupons cannot be redeemed</p>
            </div>
            <ToggleSwitch checked={form.isActive} onChange={(v) => set('isActive', v)} />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!form.code || !form.value || saving}
            onClick={() => { onSave(form); }}>
            <Check size={14} /> {saving ? 'Saving...' : coupon ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Discount | undefined>();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'discounts'],
    queryFn: () => discountsApi.list({ per_page: 100 }),
  });
  const coupons = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'discounts'] });

  const createMutation = useMutation({
    mutationFn: (payload: DiscountCreatePayload) => discountsApi.create(payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditCoupon(undefined); showBanner('success', 'Coupon created'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to create coupon')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DiscountCreatePayload }) => discountsApi.update(id, payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditCoupon(undefined); showBanner('success', 'Coupon updated'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to update coupon')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => discountsApi.delete(id),
    onSuccess: () => { invalidate(); showBanner('success', 'Coupon deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete coupon')),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => discountsApi.toggleActive(id),
    onSuccess: () => invalidate(),
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to toggle coupon')),
  });

  const handleSave = (data: CouponFormState) => {
    const payload = toApiPayload(data);
    if (editCoupon) {
      updateMutation.mutate({ id: editCoupon.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (id: number) => toggleMutation.mutate(id);

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = coupons.filter(c => {
    if (filterStatus === 'active') return c.is_active;
    if (filterStatus === 'expired') return !c.is_active;
    return true;
  });

  const stats = {
    active: coupons.filter(c => c.is_active).length,
    totalUses: coupons.reduce((s, c) => s + (c.used_count ?? 0), 0),
    totalSaved: coupons.reduce((s, c) => s + (c.type === 'fixed' ? parseFloat(c.value) * (c.used_count ?? 0) : 0), 0),
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-[1100px] mx-auto">
      {(showModal || editCoupon) && (
        <CouponFormModal
          coupon={editCoupon}
          onClose={() => { setShowModal(false); setEditCoupon(undefined); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <PageHeader
        title="Coupons &amp; Discounts"
        subtitle="Create and manage discount codes for your customers"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Create Coupon
          </Button>
        }
      />

      {banner && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Active Coupons", value: stats.active, color: "text-green-700" },
          { label: "Total Redemptions", value: stats.totalUses, color: "text-gray-900" },
          { label: "Total Discount Given", value: `৳${stats.totalSaved.toLocaleString()}`, color: "text-gray-900" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder="Search coupon code or name…"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['all', 'active', 'expired'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                filterStatus === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Desktop table */}
        <div className="hidden md:block overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Conditions</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const isExpired = c.end_date ? new Date(c.end_date) < new Date() : false;
                const valueNum = parseFloat(c.value);
                const maxDisc = c.maximum_discount ? parseFloat(c.maximum_discount) : null;
                const minAmt = c.minimum_amount ? parseFloat(c.minimum_amount) : 0;
                const startDate = c.start_date ? c.start_date.split('T')[0] : '';
                const endDate = c.end_date ? c.end_date.split('T')[0] : '';
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Tag size={12} className="text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900">{c.code}</span>
                            <button onClick={() => copyCode(c.id, c.code)}
                              className="text-gray-300 hover:text-gray-600 transition-colors">
                              {copiedId === c.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-400">{c.name ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">
                        {c.type === 'percentage' ? `${valueNum}%` : `৳${valueNum}`} off
                      </p>
                      {maxDisc && (
                        <p className="text-[11px] text-gray-400">max ৳{maxDisc.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {minAmt > 0 && <p>Min ৳{minAmt.toLocaleString()}</p>}
                      {c.usage_limit_per_customer && <p>{c.usage_limit_per_customer}× per customer</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="text-sm font-bold text-gray-900">{c.used_count}</p>
                      {c.usage_limit && (
                        <div className="mt-1">
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full"
                              style={{ width: `${Math.min(100, (c.used_count / c.usage_limit) * 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">{c.used_count}/{c.usage_limit}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <p>{startDate}</p>
                      <p>→ {endDate}</p>
                      {isExpired && <span className="text-red-500 font-medium">Expired</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch size="sm" checked={c.is_active && !isExpired} onChange={() => toggleActive(c.id)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditCoupon(c); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) deleteMutation.mutate(c.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3">
          {!isLoading && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map(c => {
                const isExpired = c.end_date ? new Date(c.end_date) < new Date() : false;
                const valueNum = parseFloat(c.value);
                const maxDisc = c.maximum_discount ? parseFloat(c.maximum_discount) : null;
                const minAmt = c.minimum_amount ? parseFloat(c.minimum_amount) : 0;
                const startDate = c.start_date ? c.start_date.split('T')[0] : '';
                const endDate = c.end_date ? c.end_date.split('T')[0] : '';
                return (
                  <MobileRowCard
                    key={c.id}
                    header={
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Tag size={12} className="text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900 text-sm">{c.code}</span>
                            <button
                              onClick={() => copyCode(c.id, c.code)}
                              aria-label="Copy code"
                              className="text-gray-300 hover:text-gray-600"
                            >
                              {copiedId === c.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                            </button>
                            {isExpired && (
                              <Badge variant="error">Expired</Badge>
                            )}
                          </div>
                          {c.name && <p className="text-[11px] text-gray-400 truncate">{c.name}</p>}
                        </div>
                      </div>
                    }
                    trailing={
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {c.type === 'percentage' ? `${valueNum}%` : `৳${valueNum}`} off
                        </p>
                        {maxDisc && (
                          <p className="text-[10px] text-gray-400">max ৳{maxDisc.toLocaleString()}</p>
                        )}
                      </div>
                    }
                    meta={
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {minAmt > 0 && <span className="text-gray-600">Min ৳{minAmt.toLocaleString()}</span>}
                        {c.usage_limit_per_customer && (
                          <span className="text-gray-600">{c.usage_limit_per_customer}× per customer</span>
                        )}
                        <span className="text-gray-500">Used {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</span>
                      </div>
                    }
                    actions={
                      <>
                        <ToggleSwitch
                          size="sm"
                          checked={c.is_active && !isExpired}
                          onChange={() => toggleActive(c.id)}
                        />
                        <button
                          onClick={() => setEditCoupon(c)}
                          aria-label="Edit coupon"
                          className="h-7 w-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) deleteMutation.mutate(c.id);
                          }}
                          aria-label="Delete coupon"
                          className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    }
                    details={
                      <>
                        {c.usage_limit && (
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-500">Usage progress</span>
                              <span className="text-gray-900">{c.used_count}/{c.usage_limit}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-black rounded-full"
                                style={{ width: `${Math.min(100, (c.used_count / c.usage_limit) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valid period</span>
                          <span className="text-gray-900">{startDate} → {endDate}</span>
                        </div>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="py-10 text-center text-sm text-gray-400">Loading coupons...</div>
        )}
        {error && !isLoading && (
          <div className="py-10 text-center text-sm text-red-500">{getApiErrorMessage(error, 'Failed to load coupons')}</div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Tag size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No coupons found</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-gray-900 font-medium hover:underline">
              Create your first coupon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
