'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useParams } from 'next/navigation';
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Package, Truck, CheckCircle2, Circle, MapPin, Clock, Calendar
} from "lucide-react";
import { orderTrackingApi } from "@/lib/api/services/storefront";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatOrderNumber } from "@/lib/format-order-number";
import type { Order } from "@/lib/api/types";

const trackingSteps = [
  { label: "Order Placed", icon: Circle, statuses: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'] },
  { label: "Processing",   icon: Package, statuses: ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'] },
  { label: "Packed",        icon: CheckCircle2, statuses: ['packed', 'shipped', 'out_for_delivery', 'delivered'] },
  { label: "Shipped",       icon: Truck, statuses: ['shipped', 'out_for_delivery', 'delivered'] },
  { label: "Delivered",     icon: MapPin, statuses: ['delivered'] },
];

function currentStepIndex(status: Order['status']): number {
  for (let i = trackingSteps.length - 1; i >= 0; i--) {
    if (trackingSteps[i].statuses.includes(status)) return i;
  }
  return 0;
}

const STATUS_VARIANT: Record<Order['status'], 'warning' | 'success' | 'info' | 'error'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  packed: 'info',
  shipped: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'error',
  refunded: 'error',
  returned: 'error',
};

export default function OrderTrackingPageWrapper() {

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Loading...</div>}>
      <OrderTrackingPage />
    </Suspense>
  );
}

function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('order') || "");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('etommerce_customer_token'));
  }, []);

  const trackMutation = useMutation({
    mutationFn: () => orderTrackingApi.track({
      order_number: query.trim(),
      email: contact.includes('@') ? contact.trim() : undefined,
      phone: contact.includes('@') ? undefined : (contact.trim() || undefined),
    }),
    onError: (err) => setError(getApiErrorMessage(err, 'Order not found')),
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    if (!loggedIn && !contact.trim()) return;
    setError("");
    trackMutation.mutate();
  };

  // Auto-submit if order number passed via URL.
  useEffect(() => {
    const orderFromUrl = searchParams.get('order');
    if (orderFromUrl && !trackMutation.data && !trackMutation.isPending) {
      setQuery(orderFromUrl);
      // Will require a contact — user has to fill phone/email and press track.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = trackMutation.data;
  const step = data ? currentStepIndex(data.status) : 0;

  return (
    <div className="container-app pt-12 pb-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-sm text-gray-500">Enter your order number + email or phone to check delivery status</p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order number"
              className="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
            />
          </div>
          {!loggedIn && (
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Email or phone"
              className="sm:w-56 h-11 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
            />
          )}
          <Button
            size="sm"
            className="h-11 px-5"
            onClick={handleSearch}
            disabled={trackMutation.isPending || !query.trim() || (!loggedIn && !contact.trim())}
          >
            {trackMutation.isPending ? 'Tracking...' : 'Track'}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Tracking result */}
        {data && (
          <div>
            {/* Order header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order {formatOrderNumber(data.order_number)}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                  <Calendar size={12} /> {new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[data.status]}>{data.status.replace(/_/g, ' ')}</Badge>
            </div>

            {/* Progress bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
              <div className="relative flex items-start justify-between">
                <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-200" />
                <div
                  className="absolute top-4 left-8 h-0.5 bg-black transition-all duration-500"
                  style={{ width: step > 0 ? `${(step / (trackingSteps.length - 1)) * 100}%` : "0%" }}
                />
                {trackingSteps.map((s, i) => {
                  const Icon = s.icon;
                  const done = i <= step;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? "bg-black border-black text-white" : "bg-white border-gray-300 text-gray-400"
                      }`}>
                        {done && i < step ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                      </div>
                      <span className={`text-[11px] text-center font-medium leading-tight ${done ? "text-gray-900" : "text-gray-400"}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tracking timeline */}
            {data.timeline && data.timeline.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-5">Tracking Timeline</h3>
                <div className="relative">
                  {data.timeline.map((event, i) => {
                    const isLast = i === (data.timeline!.length - 1);
                    return (
                      <div key={event.id} className="flex gap-4 relative">
                        {!isLast && (
                          <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200" />
                        )}
                        <div className="relative z-10 shrink-0 mt-0.5">
                          <div className="w-[15px] h-[15px] rounded-full bg-black border-2 border-black" />
                        </div>
                        <div className="pb-5">
                          <p className="text-sm font-medium text-gray-900">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                          )}
                          <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={9} /> {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery address */}
            {data.shipping_address && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin size={14} /> Delivery Address
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {[
                    (data.shipping_address as Record<string, string>).full_name,
                    (data.shipping_address as Record<string, string>).address_line_1,
                    (data.shipping_address as Record<string, string>).thana,
                    (data.shipping_address as Record<string, string>).district,
                    (data.shipping_address as Record<string, string>).division,
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Order items summary */}
            {data.items && data.items.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Order Items ({data.items.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-[11px] text-gray-400">
                            {item.variant_label ? `${item.variant_label} · ` : ''}Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        <Price value={parseFloat(item.total) || 0} />
                      </p>
                    </div>
                  ))}
                </div>
                {(() => {
                  const adv = parseFloat(data.advance_amount ?? '0') || 0;
                  const cod = parseFloat(data.cod_amount ?? '0') || 0;
                  if (adv <= 0 || cod <= 0) return null;
                  const total = parseFloat(data.total ?? '0') || 0;
                  const paid = parseFloat(data.amount_paid ?? '0') || 0;
                  const due = Math.max(0, total - paid);
                  return (
                    <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                      <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide mb-2">
                        Payment breakdown
                      </p>
                      <div className="flex justify-between text-sm text-amber-900">
                        <span>Paid</span>
                        <span className="font-semibold"><Price value={paid} /></span>
                      </div>
                      <div className="flex justify-between text-sm text-amber-900 mt-1">
                        <span>Pay on delivery</span>
                        <span className="font-semibold"><Price value={due} /></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
