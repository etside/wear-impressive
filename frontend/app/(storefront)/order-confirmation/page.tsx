'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, Package, Truck, ShoppingBag, Download, ClipboardList } from "lucide-react";
import { orderTrackingApi, storeInfoApi } from "@/lib/api/services/storefront";
import { customerAuthApi } from "@/lib/api/services/customer-auth";
import { useMetaPixel } from "@/components/store/meta-pixel-provider";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { formatOrderNumber } from "@/lib/format-order-number";
import type { Order } from "@/lib/api/types";

export default function OrderConfirmationPageWrapper() {

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Loading...</div>}>
      <OrderConfirmationPage />
    </Suspense>
  );
}

function OrderConfirmationPage() {
  const __sb = useShopBase();

  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';

  const orderQuery = useQuery<Order | null>({
    queryKey: ['storefront', 'order-track', orderNumber, phone, email],
    queryFn: async () => {
      if (!orderNumber) return null;
      try {
        return await orderTrackingApi.track({
          order_number: orderNumber,
          phone: phone || undefined,
          email: email || undefined,
        });
      } catch {
        return null;
      }
    },
    enabled: !!orderNumber,
  });

  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info'],
    queryFn: () => storeInfoApi.show(),
    staleTime: 5 * 60_000,
  });

  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('etommerce_customer_token'),
  });  const customer = meQuery.data?.customer;

  const order = orderQuery.data ?? null;
  const store = storeQuery.data;

  const { trackPurchase, config: pixelConfig } = useMetaPixel();
  useEffect(() => {
    if (order && pixelConfig?.track_purchase) {
      trackPurchase(order.order_number, parseFloat(order.total ?? '0') || 0, 'BDT');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.order_number]);

  const ship = (order?.shipping_address ?? {}) as Record<string, string | undefined>;
  const subtotal = parseFloat(order?.subtotal ?? '0') || 0;
  const shipping = parseFloat(order?.shipping_amount ?? '0') || 0;
  const discount = parseFloat(order?.discount_amount ?? '0') || 0;
  const tax = parseFloat(order?.tax_amount ?? '0') || 0;
  const total = parseFloat(order?.total ?? '0') || 0;
  const advanceAmount = parseFloat(order?.advance_amount ?? '0') || 0;
  const codAmount = parseFloat(order?.cod_amount ?? '0') || 0;
  const showAdvanceSplit = advanceAmount > 0 && codAmount > 0;

  // Generate the invoice PDF in the browser and trigger a direct download.
  // Replaces the old window.print() flow — customers wanted "Invoice-ORD-XXX.pdf"
  // landing in their Downloads folder, not the OS print dialog.
  const handleDownloadInvoice = async () => {
    if (!order) return;
    const items = order.items ?? [];
    const customerName = ship.full_name || order.guest_name || customer?.name || '—';
    const customerPhone = ship.phone || order.guest_phone || '—';
    const addressLine = [
      ship.address_line_1,
      ship.address_line_2,
      ship.thana,
      ship.district,
      ship.division,
      ship.postal_code,
    ].filter(Boolean).join(', ');

    // Build a flat address string from individual fields. The /store/info
    // response also exposes a structured `address` object (dict), but jsPDF
    // needs a plain string — using the object directly gets stringified to
    // "[object Object]" in the PDF.
    const storeAddressLine = [
      store?.address_line_1,
      store?.thana,
      store?.district,
      store?.division,
      store?.postal_code,
    ].filter(Boolean).join(', ');

    const blob = await generateInvoicePdf({
      storeName: store?.name ?? 'Wear Impressive',
      storeLogoUrl: store?.logo ?? null,
      storeEmail: store?.email ?? null,
      storePhone: store?.phone ?? null,
      storeAddress: storeAddressLine || null,
      id: `#${formatOrderNumber(order.order_number)}`,
      date: new Date(order.created_at).toLocaleString(),
      customer: { name: customerName, phone: customerPhone, address: addressLine },
      items: items.map(i => ({
        name: i.product_name,
        sku: i.sku || 'N/A',
        qty: i.quantity,
        price: parseFloat(i.price as unknown as string) || 0,
        variant: i.variant_label || '',
      })),
      subtotal,
      shippingCost: shipping,
      tax,
      discount,
      total,
      payment: order.payment_method || '—',
      paymentStatus: order.payment_status || '—',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.order_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (orderNumber) document.title = `Order ${orderNumber}`;
  }, [orderNumber]);

  return (
    <div className="container-app pt-12 pb-10 print:py-0">
      <div className="max-w-3xl mx-auto">
        {/* Success banner — hidden in print */}
        <div className="flex flex-col items-center mb-8 print:hidden">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-11 h-11 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Confirmed!</h1>
          <p className="text-sm text-gray-500">Thank you for your order. A copy has been sent to your contact details.</p>
        </div>

        {/* Invoice / Booking card — print-friendly */}
        <div id="invoice" className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Invoice</p>
              <p className="text-lg font-bold font-mono text-gray-900">#{orderNumber || '—'}</p>
              {order?.created_at && (
                <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
              )}
            </div>
            <div className="text-right">
              {store?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logo} alt={store.name} className="h-10 w-auto ml-auto mb-1" />
              ) : (
                <p className="text-sm font-bold text-gray-900">{store?.name || ''}</p>
              )}
              {store?.email && <p className="text-xs text-gray-500">{store.email}</p>}
              {store?.phone && <p className="text-xs text-gray-500">{store.phone}</p>}
            </div>
          </div>

          {/* Status + Billing */}
          {order && (
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Order Status</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{order.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Payment</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.payment_method?.toUpperCase() || '—'} · <span className="capitalize">{order.payment_status}</span>
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Fulfillment</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{order.fulfillment_status.replace(/_/g, ' ')}</p>
              </div>
            </div>
          )}

          {/* Ship-to */}
          {order && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ship To</p>
              <p className="text-sm font-medium text-gray-900">{ship.full_name || order.guest_name || customer?.name || '—'}</p>
              <p className="text-sm text-gray-600">{ship.phone || order.guest_phone || '—'}</p>
              <p className="text-sm text-gray-600">
                {[ship.address_line_1, ship.address_line_2, ship.thana, ship.district, ship.division].filter(Boolean).join(', ') || '—'}
              </p>
              {order.notes && (
                <p className="text-xs text-gray-500 mt-2"><span className="font-medium text-gray-700">Notes:</span> {order.notes}</p>
              )}
            </div>
          )}

          {/* Items */}
          {order?.items && order.items.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</p>
              <div className="divide-y divide-gray-100">
                {order.items.map((it) => {
                  const price = parseFloat(it.price) || 0;
                  const line = price * it.quantity;
                  return (
                    <div key={it.id} className="py-2.5 flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{it.product_name}</p>
                        {it.variant_label && <p className="text-xs text-gray-500">{it.variant_label}</p>}
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">×{it.quantity}</span>
                      <span className="font-medium text-gray-900 w-24 text-right"><Price value={line} /></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span><Price value={subtotal} /></span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount{order?.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>-<Price value={discount} /></span></div>
            )}
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span><Price value={shipping} /></span></div>
            {tax > 0 && (
              <div className="flex justify-between text-gray-600"><span>Tax</span><span><Price value={tax} /></span></div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 mt-1 border-t border-gray-200">
              <span>Total</span><span><Price value={total} /></span>
            </div>
            {showAdvanceSplit && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Payment breakdown
                </p>
                <div className="flex justify-between text-gray-700">
                  <span>Paid in advance</span>
                  <span className="font-semibold"><Price value={advanceAmount} /></span>
                </div>
                <div className="flex justify-between text-gray-700 mt-1">
                  <span>Pay on delivery</span>
                  <span className="font-semibold"><Price value={codAmount} /></span>
                </div>
              </div>
            )}
          </div>

          {/* What's next — screen only */}
          {!order && orderQuery.isLoading && (
            <div className="px-6 py-6 text-center text-sm text-gray-400 print:hidden">Loading order details...</div>
          )}
          {order && (
            <div className="px-6 py-4 border-t border-gray-100 space-y-2 text-sm print:hidden">
              <div className="flex items-start gap-3">
                <Package size={15} className="text-gray-500 shrink-0 mt-0.5" />
                <p className="text-gray-600">We&apos;ll start preparing your order right away.</p>
              </div>
              <div className="flex items-start gap-3">
                <Truck size={15} className="text-gray-500 shrink-0 mt-0.5" />
                <p className="text-gray-600">Estimated delivery: 3–5 business days.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions — hidden in print */}
        <div className="flex flex-wrap gap-3 mt-6 print:hidden">
          <Button variant="secondary" size="sm" onClick={handleDownloadInvoice} disabled={!order}>
            <Download size={14} /> Download Invoice
          </Button>
          {customer ? (
            <Link href={`${__sb}/account`}>
              <Button variant="secondary" size="sm">
                <ClipboardList size={14} /> My Orders
              </Button>
            </Link>
          ) : (
            // Track Order is intentionally hidden for now — owner asked to
            // keep the markup around in case the dedicated tracking page
            // gets re-enabled. Re-render by removing `false &&` below.
            false && (
              <Link href={`${__sb}/order-tracking${orderNumber ? `?order=${orderNumber}` : ''}`}>
                <Button variant="secondary" size="sm">
                  <Truck size={14} /> Track Order
                </Button>
              </Link>
            )
          )}
          <Link href={`${__sb}/products`} className="ml-auto">
            <Button size="sm">
              <ShoppingBag size={14} /> Shop More
            </Button>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white !important; }
          #invoice { box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
    </div>
  );
}
