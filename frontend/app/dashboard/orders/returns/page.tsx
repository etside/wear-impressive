'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatOrderNumber } from "@/lib/format-order-number";
import { Button } from "@/components/ui/button";
import {
  Check, X, Package, CreditCard, Eye, Search, Filter,
  AlertCircle, Image, ChevronRight, RotateCcw
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { useLang } from "@/lib/i18n/context";
import { returnsApi } from "@/lib/api/services/vendor-orders";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Return } from "@/lib/api/types";

type ReturnStatus = Return['status'];

const statusConfig: Record<ReturnStatus, { variant: "default" | "warning" | "success" | "info" | "error"; label: string; step: number }> = {
  requested: { variant: "warning", label: "Requested",     step: 0 },
  approved:  { variant: "info",    label: "Approved",      step: 1 },
  received:  { variant: "default", label: "Item Received", step: 2 },
  refunded:  { variant: "success", label: "Refunded",      step: 3 },
  rejected:  { variant: "error",   label: "Rejected",      step: -1 },
  cancelled: { variant: "default", label: "Cancelled",     step: -1 },
};

const reasonLabels: Record<string, string> = {
  defective:        "Defective / Damaged",
  wrong_item:       "Wrong Item Sent",
  not_as_described: "Not as Described",
  changed_mind:     "Changed Mind",
  other:            "Other",
};

const statSteps = [
  { key: "requested", label: "Requested" },
  { key: "approved",  label: "Approved" },
  { key: "received",  label: "Item Received" },
  { key: "refunded",  label: "Refunded" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function ReturnDetailModal({ ret, onClose, onAction, isSubmitting, errorMsg }: {
  ret: Return;
  onClose: () => void;
  onAction: (id: number, action: 'approve' | 'reject' | 'mark_received' | 'refund', data?: { notes?: string; reason?: string; amount?: number; method?: string }) => void;
  isSubmitting: boolean;
  errorMsg: string | null;
}) {
  const [vendorResponse, setVendorResponse] = useState('');
  const [refundMethod, setRefundMethod] = useState('manual');
  const [refundAmount, setRefundAmount] = useState(parseFloat(ret.refund_amount || '0') || 0);
  const step = statusConfig[ret.status].step;
  const orderNumber = ret.order?.order_number ? `#${formatOrderNumber(ret.order.order_number)}` : `order #${ret.order_id}`;
  const firstItem = ret.items?.[0];
  const productLabel = firstItem ? `Item ${firstItem.order_item_id}` : '—';
  const reasonKey = ret.reason || 'other';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">{ret.return_number}</h2>
              <Badge variant={statusConfig[ret.status].variant}>{statusConfig[ret.status].label}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Order {orderNumber} · {formatDate(ret.created_at)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* Progress stepper */}
          {ret.status !== 'rejected' && ret.status !== 'cancelled' && (
            <div className="flex items-center gap-2">
              {statSteps.map((s, i) => {
                const done = step >= i;
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-bold ${
                        done ? 'bg-black border-black text-white' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {done ? <Check size={10} /> : i + 1}
                      </div>
                      <span className={`text-[10px] text-center font-medium whitespace-nowrap ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < statSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${done && step > i ? 'bg-black' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Order & product */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Order</p>
              <p className="text-sm font-semibold text-gray-900">{orderNumber}</p>
              <p className="text-xs text-gray-500">Return items: {ret.items?.length || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Refund Amount</p>
              <p className="text-sm font-semibold text-gray-900">&#x09F3;{parseFloat(ret.refund_amount || '0').toLocaleString()}</p>
              {ret.refund_method && <p className="text-xs text-gray-500">via {ret.refund_method}</p>}
            </div>
          </div>

          {/* Reason */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <div className="flex gap-2.5">
              <AlertCircle size={15} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-yellow-900">{reasonLabels[reasonKey] || reasonKey}</p>
                {ret.notes && <p className="text-xs text-yellow-800 mt-1 leading-relaxed">&ldquo;{ret.notes}&rdquo;</p>}
              </div>
            </div>
          </div>

          {/* Actions */}
          {ret.status === 'requested' && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Your Response</p>
              <textarea
                rows={2} value={vendorResponse}
                onChange={e => setVendorResponse(e.target.value)}
                placeholder="Add a message to the customer (optional but recommended)…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none placeholder:text-gray-400 focus:border-gray-400"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={isSubmitting}
                  onClick={() => onAction(ret.id, 'approve', { notes: vendorResponse })}>
                  <Check size={14} /> Approve Return
                </Button>
                <Button variant="danger" size="sm" className="flex-1" disabled={isSubmitting}
                  onClick={() => onAction(ret.id, 'reject', { reason: vendorResponse })}>
                  <X size={14} /> Reject Return
                </Button>
              </div>
            </div>
          )}

          {ret.status === 'approved' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">Waiting for item to be returned</p>
              <p className="text-xs text-blue-700 mb-3">Once you physically receive the returned item, confirm below to proceed to refund.</p>
              <Button size="sm" disabled={isSubmitting}
                onClick={() => onAction(ret.id, 'mark_received')}>
                <Package size={14} /> Confirm Item Received
              </Button>
            </div>
          )}

          {ret.status === 'received' && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">Process Refund</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Refund Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#x09F3;</span>
                    <input type="number" value={refundAmount}
                      onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  </div>
                </div>
                <div>
                  <SearchableSelect
                    options={[
                      { value: 'original', label: 'Original Payment Method' },
                      { value: 'manual',   label: 'bKash / Nagad (Manual)' },
                      { value: 'bank',     label: 'Bank Transfer' },
                      { value: 'store_credit', label: 'Store Credit' },
                    ]}
                    value={refundMethod}
                    onChange={(v) => setRefundMethod(v)}
                    label="Refund Method"
                    searchable={false}
                  />
                </div>
              </div>
              <Button size="sm" className="w-full" disabled={isSubmitting}
                onClick={() => onAction(ret.id, 'refund', { amount: refundAmount, method: refundMethod })}>
                <CreditCard size={14} /> Process Refund — &#x09F3;{refundAmount.toLocaleString()}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReturnStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'returns', { status: activeFilter, search }],
    queryFn: () => returnsApi.list({
      status: activeFilter === 'all' ? undefined : activeFilter,
      search: search || undefined,
    }),
  });

  const records = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'returns'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => returnsApi.approve(id, notes),
    onSuccess: () => { setMutationError(null); setSelectedReturn(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to approve return')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => returnsApi.reject(id, reason),
    onSuccess: () => { setMutationError(null); setSelectedReturn(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to reject return')),
  });

  const markReceivedMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => returnsApi.markReceived(id, notes),
    onSuccess: () => { setMutationError(null); setSelectedReturn(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to mark as received')),
  });

  const processRefundMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; method?: string; notes?: string } }) =>
      returnsApi.processRefund(id, data),
    onSuccess: () => { setMutationError(null); setSelectedReturn(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to process refund')),
  });

  const handleAction = (id: number, action: 'approve' | 'reject' | 'mark_received' | 'refund', data?: { notes?: string; reason?: string; amount?: number; method?: string }) => {
    setMutationError(null);
    if (action === 'approve') approveMutation.mutate({ id, notes: data?.notes });
    else if (action === 'reject') rejectMutation.mutate({ id, reason: data?.reason });
    else if (action === 'mark_received') markReceivedMutation.mutate({ id, notes: data?.notes });
    else if (action === 'refund' && data?.amount !== undefined) {
      processRefundMutation.mutate({ id, data: { amount: data.amount, method: data.method } });
    }
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending
    || markReceivedMutation.isPending || processRefundMutation.isPending;

  const counts = {
    all:       records.length,
    requested: records.filter(r => r.status === 'requested').length,
    approved:  records.filter(r => r.status === 'approved').length,
    received:  records.filter(r => r.status === 'received').length,
    refunded:  records.filter(r => r.status === 'refunded').length,
    rejected:  records.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {selectedReturn && (
        <ReturnDetailModal
          ret={selectedReturn}
          onClose={() => { setSelectedReturn(null); setMutationError(null); }}
          onAction={handleAction}
          isSubmitting={isSubmitting}
          errorMsg={mutationError}
        />
      )}

      <PageHeader
        title="Returns"
        subtitle="Manage customer return requests and refunds"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {getApiErrorMessage(error, 'Failed to load returns')}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Awaiting Review", count: counts.requested, color: "text-yellow-600", bg: "bg-yellow-50", key: "requested" as ReturnStatus },
          { label: "Approved",        count: counts.approved,  color: "text-blue-600",   bg: "bg-blue-50",   key: "approved" as ReturnStatus },
          { label: "Item Received",   count: counts.received,  color: "text-purple-600", bg: "bg-purple-50", key: "received" as ReturnStatus },
          { label: "Refunded",        count: counts.refunded,  color: "text-green-600",  bg: "bg-green-50",  key: "refunded" as ReturnStatus },
        ].map(s => (
          <button key={s.key} onClick={() => setActiveFilter(activeFilter === s.key ? 'all' : s.key)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              activeFilter === s.key ? 'border-gray-900 bg-white' : 'border-transparent bg-white hover:border-gray-200'
            } shadow-[0_1px_3px_rgba(0,0,0,0.06)]`}
          >
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by return ID, order, customer…"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
        </div>
        {activeFilter !== 'all' && (
          <button onClick={() => setActiveFilter('all')}
            className="flex items-center gap-1.5 h-9 px-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium">
            <X size={12} /> Clear filter
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Desktop table */}
        <div className="hidden md:block overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Return ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">Loading...</td></tr>
              )}
              {!isLoading && records.map(ret => {
                const reasonKey = ret.reason || 'other';
                return (
                  <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-xs text-gray-900">{ret.return_number}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(ret.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {ret.order?.order_number ? `#${formatOrderNumber(ret.order.order_number)}` : `#${ret.order_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">{reasonLabels[reasonKey] || reasonKey}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">&#x09F3;{parseFloat(ret.refund_amount || '0').toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig[ret.status].variant}>{statusConfig[ret.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSelectedReturn(ret); setMutationError(null); }}
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <Eye size={12} /> View
                        {ret.status === 'requested' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-0.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3">
          {isLoading && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">Loading...</div>
          )}
          {!isLoading && records.length > 0 && (
            <div className="space-y-2">
              {records.map(ret => {
                const reasonKey = ret.reason || 'other';
                const orderNum = ret.order?.order_number ? `#${formatOrderNumber(ret.order.order_number)}` : `#${ret.order_id}`;
                return (
                  <MobileRowCard
                    key={ret.id}
                    header={
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-gray-900 text-xs">{ret.return_number}</span>
                        <Badge variant={statusConfig[ret.status].variant}>{statusConfig[ret.status].label}</Badge>
                      </div>
                    }
                    trailing={
                      <span className="font-semibold text-gray-900 text-sm">৳{parseFloat(ret.refund_amount || '0').toLocaleString()}</span>
                    }
                    meta={
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-700">Order {orderNum}</span>
                        <span className="text-gray-500">{reasonLabels[reasonKey] || reasonKey} · {formatDate(ret.created_at)}</span>
                      </div>
                    }
                    actions={
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => { setSelectedReturn(ret); setMutationError(null); }}
                      >
                        <Eye size={12} /> View
                        {ret.status === 'requested' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-0.5" />
                        )}
                      </Button>
                    }
                    details={
                      ret.notes ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Customer note</p>
                          <p className="text-sm text-gray-700 italic">&ldquo;{ret.notes}&rdquo;</p>
                        </div>
                      ) : null
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && records.length === 0 && (
          <div className="py-16 text-center">
            <RotateCcw size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No returns matching this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
