'use client';
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatOrderNumber } from "@/lib/format-order-number";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, Truck, CheckCircle2, Package, Tag,
  MapPin, X, ExternalLink, Phone, User, ClipboardList,
  MessageSquare, Send, StickyNote, Copy, Wallet, ImageIcon, AlertTriangle, MoreVertical,
  Loader2, CheckCircle,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { generatePackingSlipPdf, generateShippingLabelPdf } from "@/lib/packing-slip-pdf";
import Link from "next/link";
import { ordersApi, fulfillmentsApi } from "@/lib/api/services/vendor-orders";
import { vendorAuthApi } from "@/lib/api/services/vendor-auth";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";

const statusConfig: Record<string, { variant: "default" | "warning" | "success" | "info" | "error"; label: string }> = {
  pending:          { variant: "warning", label: "Pending" },
  confirmed:        { variant: "info",    label: "Confirmed" },
  processing:       { variant: "info",    label: "Confirmed" },
  packed:           { variant: "default", label: "Sent" },
  shipped:          { variant: "default", label: "Sent" },
  out_for_delivery: { variant: "default", label: "Sent" },
  delivered:        { variant: "success", label: "Delivered" },
  cancelled:        { variant: "error",   label: "Cancelled" },
  refunded:         { variant: "error",   label: "Refunded" },
  returned:         { variant: "error",   label: "Returned" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = Number(Array.isArray(params.id) ? params.id[0] : params.id);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['vendor', 'order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  // Vendor's own store info — used to brand the generated PDFs
  // (invoice / packing slip / shipping label) with the real store name,
  // address, and phone instead of placeholder text.
  const { data: meData } = useQuery({
    queryKey: ['vendor', 'me'],
    queryFn: () => vendorAuthApi.me(),
    staleTime: 5 * 60_000,
  });
  const vendorStore = meData?.store;

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [paymentRef, setPaymentRef] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor', 'order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
  };

  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.markAsConfirmed(orderId),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to confirm order')),
  });

  const markShippedMutation = useMutation({
    mutationFn: (data: { carrier: string; tracking: string; shippedAt: string }) =>
      ordersApi.markAsShipped(orderId, {
        carrier: data.carrier,
        tracking_number: data.tracking || null,
        // Send the actual handoff date; the backend derives ETA from the
        // order's frozen shipping_estimate (e.g. ship date + 2 days for a
        // "1-2 business days" zone). Vendor never types an ETA themselves.
        shipped_at: data.shippedAt || null,
      }),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to ship order')),
  });

  const markDeliveredMutation = useMutation({
    mutationFn: () => ordersApi.markAsDelivered(orderId),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to mark as delivered')),
  });

  const verifyAdvanceMutation = useMutation({
    mutationFn: () => ordersApi.verifyAdvance(orderId),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to verify advance')),
  });

  const collectCodMutation = useMutation({
    mutationFn: () => ordersApi.collectCod(orderId),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to record COD collection')),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => ordersApi.cancel(orderId, reason),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to cancel order')),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (data: { amount: number; payment_method: string; payment_reference: string }) =>
      ordersApi.markAsPaid(orderId, data),
    onSuccess: () => {
      setMutationError(null);
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentRef('');
      invalidate();
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to record payment')),
  });

  const saveInternalNotesMutation = useMutation({
    mutationFn: (text: string) => ordersApi.update(orderId, { internal_notes: text }),
    onSuccess: () => { setMutationError(null); invalidate(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to save notes')),
  });

  if (isLoading) {
    return <div className="max-w-6xl mx-auto py-12 text-center text-sm text-gray-400">Loading order...</div>;
  }
  if (error || !order) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {getApiErrorMessage(error, 'Failed to load order')}
        </div>
        <Link href="/dashboard/orders" className="mt-4 inline-block">
          <Button variant="secondary" size="sm"><ArrowLeft size={14} /> Back to orders</Button>
        </Link>
      </div>
    );
  }

  const status = order.status;
  const cfg = statusConfig[status] || { variant: 'default' as const, label: status };

  // Collapse the 10-status DB enum into 4 phases the vendor actually uses.
  // The DB still stores the granular states (packed/shipped/etc.) — we
  // bucket them for the UI so the action ladder is single-step.
  type UiState = 'pending' | 'confirmed' | 'sent' | 'delivered' | 'cancelled';
  const uiState: UiState =
    status === 'cancelled' || status === 'refunded' || status === 'returned' ? 'cancelled' :
    status === 'pending' ? 'pending' :
    status === 'confirmed' || status === 'processing' ? 'confirmed' :
    status === 'packed' || status === 'shipped' || status === 'out_for_delivery' ? 'sent' :
    status === 'delivered' ? 'delivered' :
    'pending';

  const customerName = order.customer?.name || order.guest_name || 'Guest';
  const customerPhone = order.customer?.phone || order.guest_phone || '';
  const shippingAddress = order.shipping_address as Record<string, unknown> | null;
  const addressLine = shippingAddress
    ? [shippingAddress.address_line_1, shippingAddress.thana, shippingAddress.district, shippingAddress.division, shippingAddress.postal_code]
        .filter(Boolean).join(', ')
    : '';

  const items = order.items ?? [];
  const timelineEntries = order.timeline ?? [];

  // Parse individual payment records from timeline for UI + invoice.
  const paymentTransactions = timelineEntries
    .filter(e => e.event_type === 'payment')
    .map(e => {
      const desc = e.description ?? '';
      const amountMatch = desc.match(/৳([\d,]+(?:\.\d+)?)/);
      const methodMatch = desc.match(/[Mm]ethod:\s*(\S+)/);
      return {
        date: e.created_at,
        amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0,
        method: methodMatch ? methodMatch[1] : (order.payment_method ?? '—'),
      };
    })
    .filter(t => t.amount > 0)
    .reverse();

  const subtotal = parseFloat(order.subtotal) || 0;
  const shippingCost = parseFloat(order.shipping_amount) || 0;
  const discount = parseFloat(order.discount_amount) || 0;
  const totalAmount = parseFloat(order.total) || 0;

  // Payment derivations from amount_paid + the frozen advance/cod split.
  const amountPaid = parseFloat(order.amount_paid ?? '0') || 0;
  const advanceAmount = parseFloat(order.advance_amount ?? '0') || 0;
  const codAmount = parseFloat(order.cod_amount ?? '0') || 0;
  const outstanding = Math.max(0, totalAmount - amountPaid);
  const isAdvanceSettled = advanceAmount > 0
    ? amountPaid + 0.01 >= advanceAmount
    : order.payment_status === 'paid' || amountPaid + 0.01 >= totalAmount;
  const isFullyPaid = amountPaid + 0.01 >= totalAmount;
  const isManualPayment = order.payment_method === 'manual';

  // Branding for generated PDFs — falls back to a generic label if
  // vendor info hasn't loaded yet (avoids "undefined" appearing on PDFs).
  const storeName = vendorStore?.name ?? 'Store';
  const storeAddress = vendorStore
    ? [
        vendorStore.address_line_1, vendorStore.thana,
        vendorStore.district, vendorStore.division, vendorStore.postal_code,
      ].filter(Boolean).join(', ')
    : '';
  const storePhone = vendorStore?.phone ?? '';

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const proofUrl = (meta.payment_proof_url as string | undefined) ?? null;
  const paymentWallet = (meta.payment_wallet as string | undefined) ?? null;
  const advanceMode = (meta.advance_mode as string | undefined) ?? null;
  const shippingEstimate = (meta.shipping_estimate as string | undefined) ?? null;
  const shippingZoneName = (meta.shipping_zone_name as string | undefined) ?? null;

  const handleDownloadInvoice = async () => {
    const blob = await generateInvoicePdf({
      storeName,
      storeLogoUrl: vendorStore?.logo ?? null,
      storeEmail: vendorStore?.email ?? null,
      storePhone,
      storeAddress,
      id: `#${formatOrderNumber(order.order_number)}`,
      date: formatDate(order.created_at),
      customer: { name: customerName, phone: customerPhone, address: addressLine },
      items: items.map(i => ({
        name: i.product_name, sku: i.sku || 'N/A', qty: i.quantity,
        price: parseFloat(i.price) || 0, variant: i.variant_label || '',
      })),
      subtotal, shippingCost, discount, total: totalAmount,
      payment: order.payment_method || '—', paymentStatus: order.payment_status,
      payments: paymentTransactions.length > 0 ? paymentTransactions : undefined,
      amountPaid,
    });
    triggerDownload(blob, `invoice-${order.order_number}.pdf`);
  };

  const handleDownloadPackingSlip = () => {
    const blob = generatePackingSlipPdf({
      storeName,
      orderNumber: `#${formatOrderNumber(order.order_number)}`,
      orderDate: formatDate(order.created_at),
      customerName,
      items: items.map(i => ({
        name: i.product_name, sku: i.sku || 'N/A', qtyOrdered: i.quantity,
        qtyShipped: i.quantity_fulfilled || i.quantity, variant: i.variant_label || '',
      })),
      paymentStatus: isFullyPaid ? 'paid' : 'cod',
      amountDue: outstanding,
      totalAmount,
      returnPolicy: 'Items can be returned within 7 days of delivery.',
    });
    triggerDownload(blob, `packing-slip-${order.order_number}.pdf`);
  };

  const handleDownloadShippingLabel = () => {
    const f = order.fulfillments?.[order.fulfillments.length - 1];
    const blob = generateShippingLabelPdf({
      storeName,
      storeAddress,
      storePhone,
      customerName,
      customerAddress: addressLine,
      customerPhone: customerPhone || '01700-000000',
      orderNumber: formatOrderNumber(order.order_number),
      orderDate: formatDate(order.created_at),
      paymentStatus: isFullyPaid ? 'paid' : 'cod',
      amountDue: outstanding,
      courier: f?.carrier || 'Self',
      weight: '0.5 kg',
      barcode: `880000${order.order_number}00013`,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
    });
    triggerDownload(blob, `shipping-label-${order.order_number}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* ── 1. STATUS STRIP ─────────────────────────────────────────
          Header card with order number, customer, status pill, and a
          single primary action that advances the workflow one step. */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <Link href="/dashboard/orders">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
            aria-label="Back to orders"
          >
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-gray-900">Order #{formatOrderNumber(order.order_number)}</h1>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            {!isFullyPaid && uiState !== 'cancelled' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                ৳{outstanding.toLocaleString()} outstanding
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{customerName} · {formatDate(order.created_at)}</p>
        </div>

        <div className="flex items-center gap-2">
          {uiState === 'pending' && (
            <>
              {!isFullyPaid && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPaymentAmount(String(outstanding));
                    setShowPaymentForm((s) => !s);
                  }}
                >
                  <Wallet size={14} /> Record Payment
                </Button>
              )}
              <Button size="sm" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                <CheckCircle2 size={14} />{' '}
                {confirmMutation.isPending
                  ? 'Confirming…'
                  : advanceAmount > 0 && !isAdvanceSettled
                    ? `Verify ৳${advanceAmount.toLocaleString()} & Confirm`
                    : 'Confirm Order'}
              </Button>
            </>
          )}
          {uiState === 'confirmed' && (
            <Button
              size="sm"
              onClick={() => document.getElementById('shipment-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <Truck size={14} /> Send to Courier
            </Button>
          )}
          {uiState === 'sent' && (
            <Button
              size="sm"
              onClick={() => markDeliveredMutation.mutate()}
              disabled={markDeliveredMutation.isPending}
            >
              <MapPin size={14} /> {markDeliveredMutation.isPending ? 'Marking…' : 'Mark Delivered'}
            </Button>
          )}
          {uiState === 'delivered' && !isFullyPaid && (
            <Button
              size="sm"
              onClick={() => collectCodMutation.mutate()}
              disabled={collectCodMutation.isPending}
            >
              <Wallet size={14} /> {collectCodMutation.isPending ? 'Recording…' : 'Mark COD Collected'}
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleDownloadInvoice}>
            <Printer size={14} /> Invoice
          </Button>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu((s) => !s)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
              aria-label="More actions"
            >
              <MoreVertical size={16} />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-48 py-1">
                <button
                  onClick={() => { handleDownloadPackingSlip(); setShowActionsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Package size={13} /> Packing slip
                </button>
                <button
                  onClick={() => { handleDownloadShippingLabel(); setShowActionsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Tag size={13} /> Shipping label
                </button>
                {uiState !== 'cancelled' && uiState !== 'delivered' && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={() => {
                        const reason = prompt('Cancellation reason:');
                        if (reason) cancelMutation.mutate(reason);
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <X size={13} /> Cancel order
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mutationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{mutationError}</span>
          <button onClick={() => setMutationError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── INLINE PAYMENT FORM ───────────────────────────────────── */}
      {showPaymentForm && uiState === 'pending' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Wallet size={14} className="text-gray-500" /> Record Payment
            </h2>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Amount (৳)</label>
              <input
                type="number"
                min="1"
                max={outstanding}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Max ৳${outstanding.toLocaleString()}`}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
              >
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="cod">Cash on Delivery</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="sslcommerz">SSLCommerz</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Reference / Txn ID</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="(optional)"
                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const amt = parseFloat(paymentAmount);
                if (!amt || amt <= 0) return;
                markAsPaidMutation.mutate({ amount: amt, payment_method: paymentMethod, payment_reference: paymentRef });
              }}
              disabled={markAsPaidMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              <CheckCircle2 size={14} />
              {markAsPaidMutation.isPending ? 'Saving…' : 'Save Payment'}
            </Button>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── 2. BODY: 2-column ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Customer + Items */}
        <div className="lg:col-span-2 space-y-5">

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</h2>
            </div>
            <p className="text-sm font-medium text-gray-900">{customerName}</p>
            {customerPhone && (
              <div className="mt-1 flex items-center gap-2">
                <Phone size={12} className="text-gray-400" />
                <a href={`tel:${customerPhone}`} className="text-xs text-gray-700 hover:text-gray-900">
                  {customerPhone}
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(customerPhone).catch(() => {})}
                  className="text-gray-400 hover:text-gray-700"
                  title="Copy phone"
                >
                  <Copy size={11} />
                </button>
              </div>
            )}
            {addressLine && (
              <div className="mt-2 flex items-start gap-2">
                <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" />
                <p className="text-xs text-gray-700 leading-relaxed">{addressLine}</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Items ({items.length})</h2>
            </div>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Product</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Unit</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const price = parseFloat(item.price) || 0;
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={item.image} alt={item.product_name} className="w-9 h-9 object-cover" />
                            ) : (
                              <Package size={14} className="text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{item.product_name}</p>
                            {item.variant_label && (
                              <p className="text-[11px] text-gray-500">{item.variant_label}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 text-sm text-gray-700">{item.quantity}</td>
                      <td className="text-right px-3 text-sm text-gray-700">৳{price.toLocaleString()}</td>
                      <td className="text-right px-5 text-sm font-medium text-gray-900">
                        ৳{(price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2">
              {items.map(item => {
                const price = parseFloat(item.price) || 0;
                return (
                  <MobileRowCard
                    key={item.id}
                    header={
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.image} alt={item.product_name} className="w-9 h-9 object-cover" />
                          ) : (
                            <Package size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 truncate">{item.product_name}</p>
                          {item.variant_label && (
                            <p className="text-[11px] text-gray-500 truncate">{item.variant_label}</p>
                          )}
                        </div>
                      </div>
                    }
                    trailing={
                      <span className="font-medium text-gray-900 text-sm">
                        ৳{(price * item.quantity).toLocaleString()}
                      </span>
                    }
                    meta={
                      <span className="text-gray-600">
                        {item.quantity} × ৳{price.toLocaleString()}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT: Order summary + Payment */}
        <div className="space-y-5">

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd>৳{subtotal.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Shipping</dt>
                <dd>৳{shippingCost.toLocaleString()}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>−৳{discount.toLocaleString()}</dd>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>৳{totalAmount.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</h2>
              <Badge variant={isFullyPaid ? 'success' : amountPaid > 0 ? 'warning' : 'default'}>
                {isFullyPaid ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid'}
              </Badge>
            </div>

            <dl className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <dt>Method</dt>
                <dd className="capitalize">
                  {order.payment_method ?? '—'}{paymentWallet ? ` · ${paymentWallet}` : ''}
                </dd>
              </div>
              {advanceAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <dt>Advance{advanceMode && advanceMode !== 'none' ? ` (${advanceMode.replace(/_/g, ' ')})` : ''}</dt>
                  <dd>৳{advanceAmount.toLocaleString()}</dd>
                </div>
              )}
              {codAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <dt>COD remainder</dt>
                  <dd>৳{codAmount.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between text-gray-700 font-medium">
                <dt>Received</dt>
                <dd className="text-green-600">৳{amountPaid.toLocaleString()}</dd>
              </div>
              {paymentTransactions.length > 1 && (
                <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
                  {paymentTransactions.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs px-3 py-1.5 odd:bg-gray-50 text-gray-600">
                      <span className="capitalize">{p.method} · {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span className="font-medium text-gray-800">৳{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {!isFullyPaid && (
                <div className="flex justify-between text-gray-700 font-medium">
                  <dt>Outstanding</dt>
                  <dd className="text-amber-700">৳{outstanding.toLocaleString()}</dd>
                </div>
              )}
            </dl>

            {isManualPayment && order.payment_reference && (
              <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs space-y-1.5">
                <div className="flex items-start gap-2">
                  <ClipboardList size={12} className="mt-0.5 shrink-0 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500">Transaction ID</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-900 break-all">{order.payment_reference}</span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(order.payment_reference!).catch(() => {})}
                        className="text-gray-400 hover:text-gray-700 shrink-0"
                        title="Copy"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                </div>
                {proofUrl ? (
                  <button
                    type="button"
                    onClick={() => setProofPreview(proofUrl)}
                    className="block w-full text-left group"
                  >
                    <p className="text-gray-500 mb-1 mt-1.5">Screenshot</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofUrl}
                      alt="Payment proof"
                      className="w-full max-h-40 object-cover rounded-md border border-gray-200 group-hover:border-gray-400 transition-colors"
                    />
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-500 group-hover:text-gray-700">
                      <ExternalLink size={10} /> Click to enlarge
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400 mt-1.5">
                    <ImageIcon size={12} />
                    <span>No screenshot uploaded</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Advance verification is rolled into the strip's "Confirm
                  Order" button — verifying an advance without confirming
                  the order makes no sense in a real flow, so we expose
                  one combined action up there. The Payment card only
                  shows the verification *info* (transaction id +
                  screenshot) below for the vendor to cross-check before
                  clicking Confirm. */}

              {/* Edge case: if the order was confirmed *before* an advance
                  was verified (legacy data, or a future bypass path), let
                  the vendor still settle it from here. */}
              {advanceAmount > 0 && !isAdvanceSettled && uiState !== 'pending' && uiState !== 'cancelled' && (
                <Button
                  size="sm"
                  onClick={() => verifyAdvanceMutation.mutate()}
                  disabled={verifyAdvanceMutation.isPending}
                >
                  {verifyAdvanceMutation.isPending ? 'Verifying…' : `Verify ৳${advanceAmount.toLocaleString()} Advance`}
                </Button>
              )}
              {!isFullyPaid && isAdvanceSettled && (uiState === 'sent' || uiState === 'delivered') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => collectCodMutation.mutate()}
                  disabled={collectCodMutation.isPending}
                >
                  {collectCodMutation.isPending ? 'Recording…' : `Mark ৳${outstanding.toLocaleString()} COD Collected`}
                </Button>
              )}
              {isFullyPaid && (
                <p className="text-xs text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Fully paid
                </p>
              )}
              {advanceAmount > 0 && !isAdvanceSettled && uiState === 'pending' && (
                <p className="text-xs text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>Click <span className="font-medium">Confirm Order</span> above to verify this advance.</span>
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. SHIPMENT ─────────────────────────────────────────────
          Inline form when status = confirmed (vendor's about to ship);
          read-only summary once status flips to sent. Anchor id lets
          the strip CTA scroll the form into view. */}
      {(uiState === 'confirmed' || uiState === 'sent' || uiState === 'delivered') && (
        <div id="shipment-card" className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={14} className="text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipment</h2>
          </div>
          {uiState === 'confirmed' ? (
            <ShipmentInlineForm
              order={order}
              shippingEstimate={shippingEstimate}
              shippingZoneName={shippingZoneName}
              onSubmit={(data) => markShippedMutation.mutate(data)}
              isLoading={markShippedMutation.isPending}
            />
          ) : (() => {
            const f = order.fulfillments?.[order.fulfillments.length - 1];
            if (!f) return <p className="text-sm text-gray-400">Shipment record missing.</p>;
            return (
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Courier</dt>
                <dd className="text-gray-900 capitalize">{f.carrier ?? '—'}</dd>
                <dt className="text-gray-500">Tracking #</dt>
                <dd className="text-gray-900 font-mono">{f.tracking_number ?? '—'}</dd>
                <dt className="text-gray-500">Sent on</dt>
                <dd className="text-gray-900">{f.shipped_at ? formatDate(f.shipped_at) : '—'}</dd>
                {f.estimated_delivery && (
                  <>
                    <dt className="text-gray-500">ETA</dt>
                    <dd className="text-gray-900">{formatDate(f.estimated_delivery)}</dd>
                  </>
                )}
                {f.tracking_url && (
                  <>
                    <dt className="text-gray-500">Tracking</dt>
                    <dd>
                      <a
                        href={f.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink size={13} /> Track {f.carrier === 'steadfast' ? 'on Steadfast' : 'shipment'}
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            );
          })()}
        </div>
      )}

      {/* ── 4. INTERNAL NOTES ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote size={14} className="text-gray-500" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Notes</h2>
        </div>
        <InternalNotesEditor
          value={order.internal_notes ?? ''}
          onSave={(text) => saveInternalNotesMutation.mutate(text)}
          isSaving={saveInternalNotesMutation.isPending}
        />
      </div>

      {/* Lightbox — clicking the payment-proof thumbnail opens it here
          instead of in a new tab so the vendor stays in the order
          context. Click the backdrop or the × to close; the image keeps
          its aspect ratio and never overflows the viewport. */}
      {proofPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setProofPreview(null)}
        >
          <button
            type="button"
            aria-label="Close preview"
            onClick={(e) => { e.stopPropagation(); setProofPreview(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofPreview}
            alt="Payment proof — full size"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <a
            href={proofPreview}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full"
          >
            <ExternalLink size={11} /> Open in new tab
          </a>
        </div>
      )}

      {/* ── 4b. RETURNS & REFUNDS ─────────────────────────────────── */}
      {order.returnRequests && order.returnRequests.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Returns & Refunds</h2>
          <div className="space-y-2">
            {order.returnRequests.map((ret: any) => {
              const refundAmt = parseFloat(ret.refund_amount ?? '0') || 0;
              const statusColors: Record<string, string> = {
                requested: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                approved: 'bg-blue-50 text-blue-700 border-blue-200',
                received: 'bg-purple-50 text-purple-700 border-purple-200',
                refunded: 'bg-green-50 text-green-700 border-green-200',
                rejected: 'bg-red-50 text-red-700 border-red-200',
              };
              const cls = statusColors[ret.status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
              return (
                <div key={ret.id} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${cls}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-xs">{ret.return_number}</span>
                    <span className="capitalize text-xs">{ret.status.replace('_', ' ')}</span>
                    {ret.reason && <span className="text-xs opacity-70">· {ret.reason.replace(/_/g, ' ')}</span>}
                  </div>
                  <div className="text-right">
                    {refundAmt > 0 && (
                      <span className="font-semibold">৳{refundAmt.toLocaleString()} refunded</span>
                    )}
                    {ret.refund_method && (
                      <span className="text-xs opacity-70 ml-1.5">via {ret.refund_method.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {order.returnRequests.some((r: any) => r.status === 'refunded') && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-medium">
              <span className="text-gray-600">Total refunded</span>
              <span className="text-green-700">
                ৳{order.returnRequests
                  .filter((r: any) => r.status === 'refunded')
                  .reduce((s: number, r: any) => s + (parseFloat(r.refund_amount ?? '0') || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 5. ACTIVITY LOG (collapsible) ─────────────────────────── */}
      <details className="bg-white border border-gray-200 rounded-xl">
        <summary className="px-5 py-3 cursor-pointer flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <MessageSquare size={14} /> Activity Log ({timelineEntries.length})
        </summary>
        <div className="px-5 pb-5 pt-2 space-y-3">
          {timelineEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            timelineEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900">{entry.title}</p>
                  {entry.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{formatDate(entry.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* Inline shipment form — used when uiState === 'confirmed'.
   Three fields (courier / tracking / date sent), one button. ETA is
   derived server-side from the order's frozen shipping_estimate, so the
   vendor never types it. We show a preview ("Estimated delivery: 30 Apr,
   based on 1–2 business days") so they know what gets stamped. */
function ShipmentInlineForm({
  order, onSubmit, isLoading, shippingEstimate, shippingZoneName,
}: {
  order: Order;
  onSubmit: (data: { carrier: string; tracking: string; shippedAt: string }) => void;
  isLoading: boolean;
  shippingEstimate: string | null;
  shippingZoneName: string | null;
}) {
  const [mode, setMode] = useState<'choose' | 'others'>('choose');
  const [carrier, setCarrier] = useState('self');
  const [tracking, setTracking] = useState('');
  const [shippedAt, setShippedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [showSteadfastModal, setShowSteadfastModal] = useState(false);

  const previewMaxDays = parseEstimateMaxDays(shippingEstimate);
  const previewEta = previewMaxDays !== null
    ? new Date(new Date(shippedAt).getTime() + previewMaxDays * 86400000)
    : null;

  // Initial view: two buttons
  if (mode === 'choose') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSteadfastModal(true)}
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
          >
            <Truck size={14} /> Book Steadfast
          </button>
          <button
            type="button"
            onClick={() => setMode('others')}
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
          >
            <Truck size={14} /> Others
          </button>
        </div>
        {showSteadfastModal && (
          <SteadfastBookingModal order={order} onClose={() => setShowSteadfastModal(false)} />
        )}
      </div>
    );
  }

  // Others mode: show full form
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchableSelect
          label="Courier"
          options={[
            { value: 'self', label: 'Self / Own delivery' },
            { value: 'pathao', label: 'Pathao' },
            { value: 'redx', label: 'RedX' },
            { value: 'sundarban', label: 'Sundarban' },
            { value: 'paperfly', label: 'Paperfly' },
            { value: 'other', label: 'Other' },
          ]}
          value={carrier}
          onChange={(v) => setCarrier(v)}
          searchable={false}
        />
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Tracking number</label>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="(optional)"
            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Date sent</label>
          <input
            type="date"
            value={shippedAt}
            onChange={(e) => setShippedAt(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
          />
        </div>
      </div>

      {previewEta && shippingEstimate && (
        <p className="text-xs text-gray-500">
          Estimated delivery:{' '}
          <span className="font-medium text-gray-700">
            {previewEta.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          {' '}— based on{' '}
          <span className="text-gray-700">{shippingEstimate}</span>
          {shippingZoneName ? ` (${shippingZoneName})` : ''}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit({ carrier, tracking, shippedAt })}
          disabled={isLoading}
        >
          <Truck size={14} /> {isLoading ? 'Saving…' : 'Save & mark sent'}
        </Button>
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Back
        </button>
      </div>
    </div>
  );
}

/**
 * Mirror of backend's parseDeliveryEstimateDays — pulls the *max* number
 * out of strings like "1-2 business days", "2 days", "Same day",
 * "৩-৫ কার্যদিবস". Returns null when no number can be extracted.
 */
function parseEstimateMaxDays(estimate: string | null): number | null {
  if (!estimate) return null;
  const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  const normalized = estimate.split('').map((c) => {
    const i = bn.indexOf(c);
    return i >= 0 ? String(i) : c;
  }).join('');
  if (/\b(same\s*day|today|আজ)\b/i.test(normalized)) return 0;
  const range = normalized.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (range) return Math.max(parseInt(range[1], 10), parseInt(range[2], 10));
  const single = normalized.match(/(\d+)/);
  return single ? parseInt(single[1], 10) : null;
}

/* Internal-notes editor — single textarea + Save button. Disabled
   until the customer's edited the value, so the button doesn't fire
   for no-op saves. */
function InternalNotesEditor({
  value, onSave, isSaving,
}: {
  value: string;
  onSave: (text: string) => void;
  isSaving: boolean;
}) {
  const [text, setText] = useState(value);
  const dirty = text !== value;
  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Visible to your team only. e.g. customer rescheduled to Tue, courier stuck in traffic..."
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => onSave(text)}
          disabled={!dirty || isSaving}
        >
          <Send size={13} /> {isSaving ? 'Saving…' : 'Save notes'}
        </Button>
      </div>
    </div>
  );
}

/* Steadfast courier booking modal — same flow as the orders list page. */
function SteadfastBookingModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState('0.5');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ trackingNumber: string | null; trackingUrl: string | null } | null>(null);

  const bookMutation = useMutation({
    mutationFn: async () => {
      let fulfillmentId: number;
      if (order.fulfillments && order.fulfillments.length > 0) {
        fulfillmentId = order.fulfillments[0].id;
      } else {
        const items = (order.items ?? []).map(item => ({
          order_item_id: item.id,
          quantity: item.quantity,
        }));
        const fulfillment = await fulfillmentsApi.create({
          order_id: order.id,
          items,
          notes: instructions || undefined,
        });
        fulfillmentId = fulfillment.id;
      }

      return fulfillmentsApi.bookCourier(order.id, fulfillmentId, {
        partner: 'steadfast',
        context: {
          weight: parseFloat(weight) || 0.5,
          note: instructions || undefined,
        },
      });
    },
    onSuccess: (result) => {
      setSuccess({ trackingNumber: result.tracking_number, trackingUrl: result.tracking_url });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to book courier')),
  });

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Pickup Booked!</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p>Steadfast pickup confirmed for <span className="font-bold">#{formatOrderNumber(order.order_number)}</span></p>
              {success.trackingNumber && (
                <p className="mt-1">Tracking: <span className="font-mono font-bold">{success.trackingNumber}</span></p>
              )}
            </div>
            {success.trackingUrl && (
              <a href={success.trackingUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block text-sm text-blue-600 hover:underline">
                Track on Steadfast →
              </a>
            )}
            <Button className="w-full mt-2" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck size={16} className="text-orange-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Book Steadfast Courier</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5 text-xs text-orange-800">
            Booking courier for order <span className="font-bold">#{formatOrderNumber(order.order_number)}</span>. A Steadfast pickup request will be created automatically.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Parcel Weight (kg)</label>
            <input type="number" min="0.1" step="0.1" placeholder="0.5" value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Special Instructions (optional)</label>
            <textarea rows={2} placeholder="e.g. Fragile, handle with care" value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none placeholder:text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 mb-0.5">Delivery Type</p>
              <p className="font-semibold text-gray-900">Regular Delivery</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 mb-0.5">Est. Charge</p>
              <p className="font-semibold text-gray-900">&#x09F3;80 – &#x09F3;120</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={bookMutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
            {bookMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Booking...</>
            ) : (
              <><Truck size={14} /> Confirm Pickup Request</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
