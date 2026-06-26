'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, ShoppingCart, X, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { abandonedCartsApi } from "@/lib/api/services/vendor-orders";
import { getApiErrorMessage } from "@/lib/api/client";
import type { AbandonedCart } from "@/lib/api/types";

function getRecoveryTemplate(customerName: string, products: string[], value: string) {
  return `Hi ${customerName},

We noticed you left some items in your cart:
${products.map(p => `  - ${p}`).join('\n')}

Your cart total is ${value}. Complete your purchase now and enjoy free shipping on orders over ৳1,500!

Shop now: https://wearimpressive.com/cart/recover

Thank you,
Wear Impressive`;
}

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diffMs / 36e5);
    if (h < 1) return 'just now';
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  } catch { return iso; }
}

function getCartCustomerName(cart: AbandonedCart): string {
  return (cart as any).customer?.name || cart.email?.split('@')[0] || 'Guest';
}

function getCartProducts(cart: AbandonedCart): string[] {
  return (cart.items || []).map((item: any) => {
    return item.product_name || item.name || 'Item';
  });
}

export default function AbandonedCartsPage() {
  const { t } = useLang();
  const d = t.dashAbandoned;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'abandoned-carts'],
    queryFn: () => abandonedCartsApi.list(),
  });

  const { data: stats } = useQuery({
    queryKey: ['vendor', 'abandoned-carts', 'stats'],
    queryFn: () => abandonedCartsApi.stats(),
  });

  const carts = data?.data ?? [];

  const [recoveryCart, setRecoveryCart] = useState<AbandonedCart | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const sendRecoveryMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      abandonedCartsApi.sendRecovery(id, { message }),
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'abandoned-carts'] });
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to send recovery email')),
  });

  const openRecoveryModal = (cart: AbandonedCart) => {
    setRecoveryCart(cart);
    const name = getCartCustomerName(cart);
    const products = getCartProducts(cart);
    const value = `\u09F3${parseFloat(cart.subtotal || '0').toLocaleString()}`;
    setRecoveryMessage(getRecoveryTemplate(name, products, value));
  };

  const closeRecoveryModal = () => {
    setRecoveryCart(null);
    setRecoveryMessage('');
  };

  const handleSendRecovery = () => {
    if (!recoveryCart) return;
    sendRecoveryMutation.mutate(
      { id: recoveryCart.id, message: recoveryMessage },
      {
        onSuccess: () => {
          setTimeout(closeRecoveryModal, 1500);
        },
      }
    );
  };

  const sendState = sendRecoveryMutation.isPending
    ? 'sending'
    : sendRecoveryMutation.isSuccess
      ? 'sent'
      : 'idle';

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader title={d.title} subtitle={d.subtitle} />

      {/* Summary card */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Abandoned Carts", value: String(stats?.total ?? 0), color: "text-yellow-600" },
          { label: "Potential Revenue", value: `\u09F3${parseFloat(stats?.total_value || '0').toLocaleString()}`, color: "text-gray-900" },
          { label: "Recovery Rate", value: `${(stats?.recovery_rate ?? 0).toFixed(0)}%`, color: "text-green-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {getApiErrorMessage(error, 'Failed to load abandoned carts')}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Desktop table */}
        <div className="hidden md:block overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.customer}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.items}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.value}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.time}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-gray-400">Loading...</td></tr>
              )}
              {!isLoading && carts.map(cart => {
                const isRecovered = !!cart.recovered_at;
                const name = getCartCustomerName(cart);
                const products = getCartProducts(cart);
                const value = `\u09F3${parseFloat(cart.subtotal || '0').toLocaleString()}`;
                return (
                  <tr key={cart.id} className={`hover:bg-gray-50 transition-colors ${isRecovered ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{cart.phone || cart.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart size={13} className="text-gray-400" />
                        <span className="text-gray-700">{products.length} items</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{products.slice(0, 3).join(", ")}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{value}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isRecovered ? 'success' : 'warning'}>
                        {isRecovered ? 'Recovered' : cart.recovery_sent_at ? 'Email sent' : formatRelativeTime(cart.created_at)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRecovered ? (
                        <span className="text-xs font-medium text-green-600 inline-flex items-center gap-1">
                          <CheckCircle size={13} /> Recovered
                        </span>
                      ) : (
                        <Button variant="primary" size="xs" onClick={() => openRecoveryModal(cart)}>
                          <Send size={13} /> {d.recover}
                        </Button>
                      )}
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
          {!isLoading && carts.length > 0 && (
            <div className="space-y-2">
              {carts.map(cart => {
                const isRecovered = !!cart.recovered_at;
                const name = getCartCustomerName(cart);
                const products = getCartProducts(cart);
                const value = `৳${parseFloat(cart.subtotal || '0').toLocaleString()}`;
                const statusLabel = isRecovered ? 'Recovered' : cart.recovery_sent_at ? 'Email sent' : formatRelativeTime(cart.created_at);
                return (
                  <MobileRowCard
                    key={cart.id}
                    className={isRecovered ? 'opacity-60' : undefined}
                    header={
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{name}</span>
                        <Badge variant={isRecovered ? 'success' : 'warning'}>{statusLabel}</Badge>
                      </div>
                    }
                    trailing={<span className="font-semibold text-gray-900 text-sm">{value}</span>}
                    meta={
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-500">{cart.phone || cart.email || '—'}</span>
                        <span className="text-gray-500 inline-flex items-center gap-1">
                          <ShoppingCart size={11} className="text-gray-400" />
                          {products.length} item{products.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    }
                    actions={
                      isRecovered ? (
                        <span className="text-xs font-medium text-green-600 inline-flex items-center gap-1">
                          <CheckCircle size={13} /> Recovered
                        </span>
                      ) : (
                        <Button variant="primary" size="xs" onClick={() => openRecoveryModal(cart)}>
                          <Send size={12} /> {d.recover}
                        </Button>
                      )
                    }
                    details={
                      products.length > 0 ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Items in cart</p>
                          <ul className="space-y-0.5 text-gray-700">
                            {products.map((p, i) => (
                              <li key={i} className="text-sm">· {p}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && carts.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">{d.empty}</div>
        )}
      </div>
      {/* Recovery Modal */}
      {recoveryCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeRecoveryModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            {sendState === 'sent' ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Recovery email sent</p>
                <p className="text-xs text-gray-500">Email sent to {recoveryCart.email}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Send Recovery Email</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Remind {getCartCustomerName(recoveryCart)} to complete their purchase</p>
                  </div>
                  <button onClick={closeRecoveryModal} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                    <X size={15} />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {mutationError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                      {mutationError}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Customer Email</label>
                    <input
                      type="email"
                      value={recoveryCart.email || ''}
                      readOnly
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cart Value</label>
                    <p className="text-sm font-semibold text-gray-900">
                      &#x09F3;{parseFloat(recoveryCart.subtotal || '0').toLocaleString()} ({getCartProducts(recoveryCart).length} items)
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Recovery Message</label>
                    <textarea
                      value={recoveryMessage}
                      onChange={e => setRecoveryMessage(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
                  <Button variant="secondary" size="sm" onClick={closeRecoveryModal}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSendRecovery} disabled={sendState === 'sending'}>
                    <Send size={13} /> {sendState === 'sending' ? 'Sending...' : 'Send Recovery Email'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
