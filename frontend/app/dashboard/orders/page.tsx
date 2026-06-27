'use client';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatOrderNumber } from "@/lib/format-order-number";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, Truck, ChevronDown, X, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { useLang } from "@/lib/i18n/context";
import Link from "next/link";
import { ordersApi, fulfillmentsApi } from "@/lib/api/services/vendor-orders";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";

const statusConfig: Record<string, { variant: "default" | "warning" | "success" | "info" | "error"; label: string }> = {
  pending:          { variant: "warning", label: "Pending" },
  confirmed:        { variant: "info",    label: "Confirmed" },
  processing:       { variant: "warning", label: "Processing" },
  packed:           { variant: "info",    label: "Packed" },
  shipped:          { variant: "default", label: "Shipped" },
  out_for_delivery: { variant: "default", label: "Out for delivery" },
  delivered:        { variant: "success", label: "Delivered" },
  cancelled:        { variant: "error",   label: "Cancelled" },
  refunded:         { variant: "error",   label: "Refunded" },
  returned:         { variant: "error",   label: "Returned" },
};

const tabs: { label: string; value?: Order['status'] }[] = [
  { label: "All" },
  { label: "Pending",    value: 'pending' },
  { label: "Confirmed",  value: 'confirmed' },
  { label: "Processing", value: 'processing' },
  { label: "Shipped",    value: 'shipped' },
  { label: "Delivered",  value: 'delivered' },
  { label: "Cancelled",  value: 'cancelled' },
];

function formatCurrency(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `৳${(n || 0).toLocaleString()}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return iso;
  }
}

function getCustomerName(order: Order): string {
  return order.customer?.name || order.guest_name || 'Guest';
}

function getCustomerPhone(order: Order): string {
  return order.customer?.phone || order.guest_phone || '—';
}

// Steadfast booking modal
function SteadfastModal({ order, onClose }: { order: { id: number; orderNumber: string }; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState('0.5');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ trackingNumber: string | null; trackingUrl: string | null } | null>(null);

  const bookMutation = useMutation({
    mutationFn: async () => {
      // 1. Fetch full order to get fulfillments
      const fullOrder = await ordersApi.get(order.id);

      // 2. Get or create fulfillment
      let fulfillmentId: number;
      if (fullOrder.fulfillments && fullOrder.fulfillments.length > 0) {
        fulfillmentId = fullOrder.fulfillments[0].id;
      } else {
        // Create a fulfillment with all order items
        const items = (fullOrder.items ?? []).map(item => ({
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

      // 3. Book Steadfast courier
      const result = await fulfillmentsApi.bookCourier(order.id, fulfillmentId, {
        partner: 'steadfast',
        context: {
          weight: parseFloat(weight) || 0.5,
          note: instructions || undefined,
        },
      });

      return result;
    },
    onSuccess: (result) => {
      setSuccess({
        trackingNumber: result.tracking_number,
        trackingUrl: result.tracking_url,
      });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'Failed to book courier'));
    },
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
              <p>Steadfast pickup confirmed for <span className="font-bold">#{formatOrderNumber(order.orderNumber)}</span></p>
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
            Booking courier for order <span className="font-bold">#{formatOrderNumber(order.orderNumber)}</span>. A Steadfast pickup request will be created automatically.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
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

export default function OrdersPage() {
  const { t } = useLang();
  const d = t.dashOrders;
  const [activeTab, setActiveTab] = useState(0);
  const [steadfastOrder, setSteadfastOrder] = useState<{ id: number; orderNumber: string } | null>(null);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 10;

  const filters = useMemo(() => ({
    page: currentPage,
    per_page: PAGE_SIZE,
    search: searchQuery || undefined,
    status: tabs[activeTab]?.value,
    payment_status: paymentFilter ? (paymentFilter as 'paid' | 'pending' | 'failed' | 'refunded' | 'partial') : undefined,
  }), [currentPage, searchQuery, activeTab, paymentFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'orders', filters],
    queryFn: () => ordersApi.list(filters),
  });

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.last_page ?? 1);

  // When filters change, reset page to 1 via onChange handlers on filter inputs
  const changeTab = (i: number) => { setActiveTab(i); setCurrentPage(1); };
  const changePayment = (v: string) => { setPaymentFilter(v); setCurrentPage(1); };
  const changeSearch = (v: string) => { setSearchQuery(v); setCurrentPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: Order[] = [];
      let page = 1;
      while (true) {
        const res = await ordersApi.list({ ...filters, page, per_page: 100 });
        all.push(...(res.data ?? []));
        if (page >= (res.last_page ?? 1)) break;
        page++;
      }
      const header = ['Order #', 'Customer', 'Phone', 'Date', 'Items', 'Payment Method', 'Payment Status', 'Amount (BDT)', 'Status'];
      const rows = all.map(o => [
        o.order_number ?? '',
        getCustomerName(o),
        getCustomerPhone(o),
        formatDate(o.created_at),
        String(o.items?.reduce((s, it) => s + (it.quantity ?? 0), 0) ?? 0),
        o.payment_method ?? '',
        o.payment_status ?? '',
        o.total ?? '0',
        (statusConfig[o.status]?.label ?? o.status),
      ]);
      const csv = [header, ...rows]
        .map(row => row.map(cell => {
          const str = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
  };

  const pageNumbers = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : currentPage <= 3
      ? [1, 2, 3, '…', totalPages]
      : currentPage >= totalPages - 2
        ? [1, '…', totalPages - 2, totalPages - 1, totalPages]
        : [1, '…', currentPage, '…', totalPages];

  return (
    <div className="max-w-[1200px] mx-auto">
      {steadfastOrder && (
        <SteadfastModal order={steadfastOrder} onClose={() => setSteadfastOrder(null)} />
      )}

      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {d.export}
          </Button>
        }
      />

      {/* Tabs — desktop only; mobile uses the Order Status dropdown below */}
      <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5 overflow-visible">
        {tabs.map((tab, i) => (
          <button key={tab.label} onClick={() => changeTab(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              i === activeTab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <div className="relative w-full md:flex-1 md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={searchQuery} onChange={e => changeSearch(e.target.value)}
            placeholder="Search by order ID, name, phone..."
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
        </div>

        {/* Order Status (mobile only) + Payment Status share one row on mobile */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* Order Status — mobile only (desktop uses the tabs above) */}
          <div className="md:hidden flex-1">
            <SearchableSelect
              options={tabs.map((tab, i) => ({ value: String(i), label: tab.label === 'All' ? 'All Orders' : tab.label }))}
              value={String(activeTab)}
              onChange={(v) => changeTab(Number(v))}
              placeholder="Order Status"
              searchable={false}
              size="sm"
            />
          </div>

          <div className="flex-1 md:flex-none">
            <SearchableSelect
              options={[
                { value: '', label: 'Payment Status' },
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              value={paymentFilter}
              onChange={(v) => changePayment(v)}
              placeholder="Payment Status"
              searchable={false}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {getApiErrorMessage(error, 'Failed to load orders')}
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Desktop table */}
        <div className="hidden md:block overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded" /></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Items</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">Loading orders...</td>
                </tr>
              )}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">No orders found.</td>
                </tr>
              )}
              {!isLoading && orders.map(order => {
                const cfg = statusConfig[order.status] || { variant: 'default' as const, label: order.status };
                const itemCount = order.items?.reduce((s, it) => s + (it.quantity || 0), 0) ?? 0;
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-gray-900 text-xs">#{formatOrderNumber(order.order_number)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{getCustomerName(order)}</p>
                      <p className="text-xs text-gray-500">{getCustomerPhone(order)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-center text-gray-600 text-sm">{itemCount}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span>{order.payment_method || '—'}</span>
                        {(() => {
                          // Show "Advance Paid" pill when the customer has actually
                          // committed money (advance > 0 AND a txn ref was submitted).
                          const adv = parseFloat(order.advance_amount ?? '0') || 0;
                          if (adv > 0 && order.payment_reference) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded w-fit">
                                Advance ৳{Math.round(adv).toLocaleString()}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end items-center">
                        {(() => {
                          const trackingUrl = order.fulfillments?.find(f => f.tracking_url)?.tracking_url;
                          if (trackingUrl) {
                            return (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-2 flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                              >
                                <ExternalLink size={11} /> Track
                              </a>
                            );
                          }
                          return null;
                        })()}
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="ghost" size="xs"><Eye size={13} /></Button>
                        </Link>
                        {(order.status === 'confirmed' || order.status === 'processing') && (
                          <button
                            onClick={() => setSteadfastOrder({ id: order.id, orderNumber: order.order_number ?? '' })}
                            className="h-7 px-2.5 flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded transition-colors"
                          >
                            <Truck size={11} /> Book
                          </button>
                        )}
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
          {isLoading && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">Loading orders...</div>
          )}
          {!isLoading && orders.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No orders found.</div>
          )}
          {!isLoading && orders.length > 0 && (
            <div className="space-y-2">
              {orders.map(order => {
                const cfg = statusConfig[order.status] || { variant: 'default' as const, label: order.status };
                const itemCount = order.items?.reduce((s, it) => s + (it.quantity || 0), 0) ?? 0;
                const adv = parseFloat(order.advance_amount ?? '0') || 0;
                const hasAdvance = adv > 0 && !!order.payment_reference;
                return (
                  <MobileRowCard
                    key={order.id}
                    header={
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-gray-900 text-xs">#{formatOrderNumber(order.order_number)}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                    }
                    trailing={
                      <span className="font-semibold text-gray-900 text-sm">{formatCurrency(order.total)}</span>
                    }
                    meta={
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-700 font-medium">{getCustomerName(order)}</span>
                        <span className="text-gray-500">{getCustomerPhone(order)} · {itemCount} item{itemCount === 1 ? '' : 's'}</span>
                      </div>
                    }
                    actions={
                      <>
                        {(() => {
                          const trackingUrl = order.fulfillments?.find(f => f.tracking_url)?.tracking_url;
                          if (trackingUrl) {
                            return (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-3 flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                              >
                                <ExternalLink size={11} /> Track
                              </a>
                            );
                          }
                          return null;
                        })()}
                        <Link href={`/dashboard/orders/${order.id}`} className="flex-1">
                          <Button variant="secondary" size="xs" className="w-full justify-center">
                            <Eye size={12} /> View
                          </Button>
                        </Link>
                        {(order.status === 'confirmed' || order.status === 'processing') && (
                          <button
                            onClick={() => setSteadfastOrder({ id: order.id, orderNumber: order.order_number ?? '' })}
                            className="h-7 px-3 flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded transition-colors"
                          >
                            <Truck size={11} /> Book
                          </button>
                        )}
                      </>
                    }
                    details={
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment</span>
                          <span className="text-gray-900">{order.payment_method || '—'}</span>
                        </div>
                        {hasAdvance && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Advance paid</span>
                            <span className="text-green-700 font-medium">৳{Math.round(adv).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Placed</span>
                          <span className="text-gray-900">{formatDate(order.created_at)}</span>
                        </div>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}&ndash;{Math.min(currentPage * PAGE_SIZE, total)} of {total} orders
          </p>
          <div className="flex gap-1">
            {pageNumbers.map((p, i) => (
              <button key={i}
                disabled={typeof p !== 'number'}
                onClick={() => typeof p === 'number' && setCurrentPage(p)}
                className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                  p === currentPage ? "bg-black text-white" : typeof p === 'number' ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 cursor-default"
                }`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
