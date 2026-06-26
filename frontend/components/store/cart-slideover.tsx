'use client';

/**
 * Right-side slide-over cart drawer used by the storefront header.
 *
 * Why this exists alongside /cart:
 *   - Lets shoppers add to cart and immediately glance at totals + checkout
 *     without losing context (PDP scroll position, applied filters, etc.).
 *   - Mirrors a Daraz/Shopify-style experience the brand owner asked for.
 *
 * The drawer reads from the same `['storefront', 'cart']` query key the
 * full /cart page uses, so updates from either surface stay in sync via
 * React Query invalidation.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Minus, Plus, Trash2, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShopBase } from '@/lib/use-shop-base';
import { useLang } from '@/lib/i18n/context';
import { Price } from '@/lib/format-price';
import { Button } from '@/components/ui/button';
import { cartApi } from '@/lib/api/services/storefront';
import { getApiErrorMessage } from '@/lib/api/client';
import { CartItemVariantPicker } from '@/components/store/cart-item-variant-picker';
import type { Cart, CartItem } from '@/lib/api/types';

interface CartSlideoverProps {
  open: boolean;
  onClose: () => void;
}

export function CartSlideover({ open, onClose }: CartSlideoverProps) {
  const __sb = useShopBase();
  const { t } = useLang();
  const c = t.cart;
  const qc = useQueryClient();

  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');

  // Lock body scroll while the drawer is open so wheel/touch goes to the
  // drawer's own scroll container, not the page underneath.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close — same expectation users have from any modal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Only fetch when open — saves a request on every page that just renders
  // the layout. Cart count badge in the header has its own short-staleTime
  // query so the icon stays accurate.
  const cartQuery = useQuery({
    queryKey: ['storefront', 'cart'],
    queryFn: () => cartApi.show(),
    enabled: open,
    staleTime: 10_000,
  });

  const cart: Cart | undefined = cartQuery.data;
  const items: CartItem[] = cart?.items ?? [];
  const itemCount = items.reduce((s, i) => s + (i.quantity ?? 0), 0);

  const updateMutation = useMutation({
    mutationFn: (p: { itemId: number; quantity: number }) =>
      cartApi.update(p.itemId, { quantity: p.quantity }),
    onSuccess: (data) => qc.setQueryData(['storefront', 'cart'], data),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.remove(itemId),
    onSuccess: (data) => qc.setQueryData(['storefront', 'cart'], data),
  });

  const couponMutation = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (data) => {
      qc.setQueryData(['storefront', 'cart'], data);
      setCouponError('');
      setCoupon('');
    },
    onError: (err) => setCouponError(getApiErrorMessage(err, 'Invalid coupon')),
  });

  const updateQty = (item: CartItem, delta: number) => {
    if (item.id == null) return;
    const next = Math.max(1, (item.quantity ?? 1) + delta);
    updateMutation.mutate({ itemId: item.id, quantity: next });
  };

  const removeItem = (itemId: number | null) => {
    if (itemId == null) return;
    removeMutation.mutate(itemId);
  };

  const applyCoupon = () => {
    const code = coupon.trim();
    if (!code) return;
    couponMutation.mutate(code);
  };

  const subtotal = parseFloat(cart?.subtotal ?? '0') || 0;
  const discount = parseFloat(cart?.discount_amount ?? '0') || 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">
              {c.title} ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto">
          {cartQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading cart...</div>
          ) : items.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">{c.empty}</p>
              <Link href={`${__sb}/products`} onClick={onClose}>
                <Button size="sm">{c.continueShopping}</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(item => {
                const price = parseFloat(item.price) || 0;
                const lineTotal = price * (item.quantity ?? 1);
                const isBundle = !!item.is_bundle;
                return (
                  <li key={item.id ?? `${item.product_id}-${item.variant_id ?? 'p'}`} className="flex gap-3 px-5 py-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                      {item.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title + remove */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                          {isBundle && (
                            <span className="inline-flex items-center text-[9px] font-semibold bg-[#2596be]/10 text-[#2596be] px-1.5 py-0.5 rounded shrink-0">
                              BUNDLE
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={removeMutation.isPending}
                          aria-label="Remove item"
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Bundle children breakdown */}
                      {isBundle && item.components && item.components.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {item.components.map(comp => (
                            <li key={comp.id} className="text-[11px] text-gray-500 truncate">
                              · {comp.product_name}{comp.variant_label ? ` (${comp.variant_label})` : ''} ×{comp.quantity}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Pickers + Qty + Price on a single row. Each control
                          carries its own uppercase caption so the line still
                          reads cleanly even if the customer has 2-3 axes
                          (Size + Color), then qty stepper, then line price. */}
                      <div className="flex flex-wrap items-end gap-2 mt-2">
                        {!isBundle && <CartItemVariantPicker item={item} />}

                        {/* QTY — inline label + stepper to match the picker style */}
                        {isBundle ? (
                          <div className="inline-flex flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              Qty
                            </span>
                            <span className="h-8 px-3 inline-flex items-center text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-lg">
                              {item.quantity}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              Qty
                            </span>
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden h-8">
                              <button
                                type="button"
                                onClick={() => updateQty(item, -1)}
                                disabled={updateMutation.isPending || (item.quantity ?? 1) <= 1}
                                aria-label="Decrease quantity"
                                className="w-7 h-full flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                              >
                                <Minus size={11} className="text-gray-600" />
                              </button>
                              <span className="w-7 text-center text-xs font-semibold text-gray-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(item, 1)}
                                disabled={updateMutation.isPending}
                                aria-label="Increase quantity"
                                className="w-7 h-full flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40"
                              >
                                <Plus size={11} className="text-gray-600" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Push the price to the far right of the row */}
                        <span className="ml-auto text-sm font-semibold text-gray-900 self-end pb-0.5">
                          <Price value={lineTotal} />
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer — only when there are items. Coupon sits ABOVE subtotal
            per the brand owner's request, so applying a code feels like
            it directly affects the total below it. */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder={c.couponPlaceholder}
                    className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={applyCoupon}
                  disabled={couponMutation.isPending || !coupon.trim()}
                >
                  {couponMutation.isPending ? '...' : c.apply}
                </Button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
              {cart?.coupon_code && (
                <p className="text-xs text-green-600 mt-1.5">
                  Coupon <strong>{cart.coupon_code}</strong> applied
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 text-sm">
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>−<Price value={discount} /></span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900">
                <span>{c.subtotal}</span>
                <span><Price value={total} /></span>
              </div>
              <p className="text-[11px] text-gray-400">{c.shipping}: calculated at checkout</p>
            </div>

            <Link href={`${__sb}/checkout`} onClick={onClose} className="block">
              <Button size="sm" className="w-full justify-center">
                {c.checkout} <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
