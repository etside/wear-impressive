"use client";
import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { cartApi } from "@/lib/api/services/storefront";
import { getApiErrorMessage } from "@/lib/api/client";
import { CartItemVariantPicker } from "@/components/store/cart-item-variant-picker";
import type { Cart, CartItem } from "@/lib/api/types";

export default function CartPage() {
  const __sb = useShopBase();


  const { t } = useLang();
  const c = t.cart;
  const qc = useQueryClient();

  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [quantityError, setQuantityError] = useState("");

  const cartQuery = useQuery({
    queryKey: ['storefront', 'cart'],
    queryFn: () => cartApi.show(),
  });

  const cart: Cart | undefined = cartQuery.data;
  const items: CartItem[] = cart?.items ?? [];

  const updateMutation = useMutation({
    mutationFn: (p: { itemId: number; quantity: number }) =>
      cartApi.update(p.itemId, { quantity: p.quantity }),
    onSuccess: (data) => {
      qc.setQueryData(['storefront', 'cart'], data);
      setQuantityError("");
    },
    onError: (err) => setQuantityError(getApiErrorMessage(err, 'Could not update quantity.')),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.remove(itemId),
    onSuccess: (data) => qc.setQueryData(['storefront', 'cart'], data),
  });

  const couponMutation = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (data) => {
      qc.setQueryData(['storefront', 'cart'], data);
      setCouponError("");
      setCoupon("");
    },
    onError: (err) => setCouponError(getApiErrorMessage(err, 'Invalid coupon')),
  });

  const stockLimit = (item: CartItem): number | null => {
    if (!item.product?.track_inventory) return null;
    return item.variant?.stock ?? item.product?.stock ?? null;
  };

  const updateQty = (item: CartItem, delta: number) => {
    if (item.id == null) return;
    const limit = stockLimit(item);
    let next = Math.max(1, (item.quantity ?? 1) + delta);
    if (limit != null) next = Math.min(next, limit);
    if (next === item.quantity) return;
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
  // Shipping is calculated at checkout (once the customer picks a zone).
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="container-app pt-12 pb-10">
      <nav className="flex gap-2 text-xs text-gray-500 mb-6">
        <Link href={__sb} className="hover:text-gray-900">{c.home}</Link>
        <span>/</span>
        <span className="text-gray-900">{c.title}</span>
      </nav>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{c.title} ({items.length} {c.items})</h1>

      {cartQuery.isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading cart...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{c.empty}</p>
          <Link href={`${__sb}/products`}><Button>{c.continueShopping}</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2">
            {quantityError && <p className="text-xs text-red-500 mb-2">{quantityError}</p>}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {items.map((item, i) => {
                const price = parseFloat(item.price) || 0;
                const lineTotal = price * (item.quantity ?? 1);
                const isBundle = !!item.is_bundle;
                const limit = stockLimit(item);
                return (
                  <div key={item.id ?? i} className={`flex gap-4 p-4 ${i < items.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0 overflow-hidden">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                            {isBundle && (
                              <span className="inline-flex items-center text-[9px] font-semibold bg-[#2596be]/10 text-[#2596be] px-1.5 py-0.5 rounded shrink-0">
                                BUNDLE
                              </span>
                            )}
                          </div>
                          {isBundle ? (
                            // For bundles: list the components + chosen variant.
                            // Component-level quantities are already pre-multiplied
                            // by bundle qty, so we display them as-is.
                            item.components && item.components.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {item.components.map(c => (
                                  <li key={c.id} className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <span>· {c.product_name}</span>
                                    {c.variant_label && <span className="text-gray-400">({c.variant_label})</span>}
                                    <span className="text-gray-400">×{c.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          ) : (
                            <CartItemVariantPicker item={item} />
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={removeMutation.isPending}
                          className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        {isBundle ? (
                          // Qty change for bundles isn't supported in v1
                          // (would need to cascade to children rows). Show
                          // a static count instead — the user can remove
                          // and re-add to buy a different number of sets.
                          <div className="text-xs text-gray-500">
                            Qty: <span className="font-semibold text-gray-900">{item.quantity}</span>
                            <span className="ml-2 text-gray-400">(remove + re-add to change)</span>
                          </div>
                        ) : (
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateQty(item, -1)}
                              disabled={updateMutation.isPending || (item.quantity ?? 1) <= 1}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                            >
                              <Minus size={13} className="text-gray-600" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item, 1)}
                              disabled={updateMutation.isPending || (limit != null && (item.quantity ?? 1) >= limit)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                            >
                              <Plus size={13} className="text-gray-600" />
                            </button>
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-900"><Price value={lineTotal} /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={c.couponPlaceholder}
                    value={coupon}
                    onChange={e => setCoupon(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={applyCoupon}
                  disabled={couponMutation.isPending || !coupon.trim()}
                >
                  {couponMutation.isPending ? 'Applying...' : c.apply}
                </Button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
              {cart?.coupon_code && (
                <p className="text-xs text-green-600 mt-2">
                  Coupon <strong>{cart.coupon_code}</strong> applied
                </p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">{c.checkout}</h2>
              <div className="flex flex-col gap-2.5 text-sm mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>{c.subtotal} ({items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)} {c.items})</span>
                  <span><Price value={subtotal} /></span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-<Price value={discount} /></span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>{c.shipping}</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mb-4">
                <div className="flex justify-between font-semibold text-gray-900 text-sm">
                  <span>{c.total}</span>
                  <span><Price value={total} /></span>
                </div>
              </div>
              <Link href={`${__sb}/checkout`}>
                <Button fullWidth size="lg">
                  {c.checkout} <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href={`${__sb}/products`} className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3">
                ← {c.continueShopping}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

