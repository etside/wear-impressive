'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Check } from 'lucide-react';
import { cartApi, publicProductsApi } from '@/lib/api/services/storefront';
import type { CartItem, Product, ProductVariant } from '@/lib/api/types';

/**
 * Inline picker rendered inside each cart line. Lets the customer change any
 * variant axis (Size, Color, …) without leaving the cart. Falls back to the
 * static `variant_label` while the product detail is loading or if the
 * product has no variants configured.
 *
 * Shared between the full /cart page and the right-side slideover so both
 * surfaces stay in sync.
 */
export function CartItemVariantPicker({ item }: { item: CartItem }) {
  const qc = useQueryClient();

  const productQuery = useQuery({
    queryKey: ['storefront', 'product', String(item.product_id)],
    queryFn: () => publicProductsApi.get(String(item.product_id)),
    enabled: !!item.product_id,
    staleTime: 60_000,
  });

  const swapMutation = useMutation({
    mutationFn: (variantId: number) =>
      cartApi.update(item.id as number, { variant_id: variantId }),
    onSuccess: (data) => qc.setQueryData(['storefront', 'cart'], data),
  });

  const product: Product | undefined = productQuery.data;
  const variants: ProductVariant[] = (product?.variants ?? []).filter((v) => v.is_active);

  // Derive the axes (e.g. ["Size", "Color"]) and the unique values per axis,
  // preserving the order of the first variant that exposes each label.
  const axes: string[] = [];
  const valuesByAxis: Record<string, string[]> = {};
  for (const v of variants) {
    for (const [label, value] of Object.entries(v.options ?? {})) {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) continue;
      if (!axes.includes(label)) {
        axes.push(label);
        valuesByAxis[label] = [];
      }
      if (!valuesByAxis[label].includes(trimmed)) {
        valuesByAxis[label].push(trimmed);
      }
    }
  }

  const currentVariant = variants.find((v) => v.id === item.variant_id);
  const currentOpts: Record<string, string> = currentVariant?.options ?? {};

  if (!productQuery.isLoading && axes.length === 0) {
    return item.variant_label ? (
      <p className="text-xs text-gray-500 mt-0.5">{item.variant_label}</p>
    ) : null;
  }

  if (productQuery.isLoading) {
    return item.variant_label ? (
      <p className="text-xs text-gray-500 mt-0.5">{item.variant_label}</p>
    ) : null;
  }

  const handleChange = (axis: string, nextValue: string) => {
    const target: Record<string, string> = { ...currentOpts, [axis]: nextValue };
    const exact = variants.find((v) =>
      axes.every((a) => String(v.options?.[a] ?? '').trim() === target[a]),
    );
    if (exact) {
      swapMutation.mutate(exact.id);
      return;
    }
    // Fallback: pick the first variant that matches the axis the user just
    // changed (e.g. only Color exists for that Size). Rare but prevents a
    // dead-end selection.
    const partial = variants.find(
      (v) => String(v.options?.[axis] ?? '').trim() === nextValue,
    );
    if (partial) swapMutation.mutate(partial.id);
  };

  const isOutOfStock = (axis: string, value: string): boolean => {
    const target: Record<string, string> = { ...currentOpts, [axis]: value };
    const match = variants.find((v) =>
      axes.every((a) => String(v.options?.[a] ?? '').trim() === target[a]),
    );
    if (!match) return false;
    return (match.stock ?? 0) <= 0;
  };

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {axes.map((axis) => {
        const current = currentOpts[axis] ?? '';
        return (
          <ModernPicker
            key={axis}
            label={axis}
            value={current}
            options={valuesByAxis[axis].map((val) => ({
              value: val,
              outOfStock: isOutOfStock(axis, val),
            }))}
            disabled={swapMutation.isPending}
            onChange={(next) => handleChange(axis, next)}
          />
        );
      })}
    </div>
  );
}

/**
 * Custom dropdown that replaces the native <select> for variant picking.
 *
 * Why custom: the native popup is OS-painted and can't be styled — looked
 * dated and out of place inside the cart slideover. This version opens a
 * floating panel with rounded corners, a soft shadow, hover/active states,
 * and a check-mark on the selected option. Closes on outside-click or Esc.
 */
function ModernPicker({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; outOfStock: boolean }[];
  disabled?: boolean;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`group inline-flex items-center justify-between gap-2 min-w-[68px] h-8 pl-3 pr-2 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all outline-none focus:ring-2 focus:ring-[#2596be]/20 focus:border-[#2596be] disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'border-[#2596be] ring-2 ring-[#2596be]/20' : ''}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || '—'}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[110px] bg-white rounded-xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] py-1 max-h-56 overflow-y-auto">
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.outOfStock}
                onClick={() => {
                  if (opt.outOfStock) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  opt.outOfStock
                    ? 'text-gray-300 cursor-not-allowed line-through'
                    : isSelected
                      ? 'bg-[#2596be]/10 text-[#2596be] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.value}{opt.outOfStock ? ' (out)' : ''}</span>
                {isSelected && !opt.outOfStock && (
                  <Check size={12} className="text-[#2596be]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
