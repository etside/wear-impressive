"use client";
/**
 * MobileRowCard — the unit row used to render table data as cards on
 * mobile. Use it inside a `<div className="md:hidden">` block alongside
 * the regular desktop `<table>` so each list page has both layouts.
 *
 * Slots:
 *   header   — top line: identity (e.g. "#ORD-123" + status badge)
 *   trailing — top-right: usually a strong number (price, qty)
 *   meta     — second line under the header (e.g. "Customer · 2d ago")
 *   actions  — always-visible button row (Confirm, Ship, Edit). Stop
 *              event propagation inside these so buttons don't toggle
 *              expansion.
 *   details  — hidden by default, revealed by the chevron. Put
 *              secondary metadata here (full address, shipping notes,
 *              line item count, etc.).
 *
 * Other props:
 *   href     — wraps the whole card body in a Link. Mutually exclusive
 *              with `details` (use one or the other — full-card link
 *              for navigate-to-detail, or expand for inline metadata).
 *   selected/onSelect — checkbox on the left for bulk selection.
 */
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileRowCardProps {
  header: React.ReactNode;
  trailing?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  details?: React.ReactNode;
  href?: string;
  selected?: boolean;
  onSelect?: (next: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
}

export function MobileRowCard({
  header,
  trailing,
  meta,
  actions,
  details,
  href,
  selected,
  onSelect,
  defaultOpen = false,
  className,
}: MobileRowCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = !!details;
  const hasCheckbox = onSelect !== undefined;

  const body = (
    <div className="flex-1 min-w-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">{header}</div>
        {trailing && <div className="shrink-0 text-right">{trailing}</div>}
        {hasDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-label={open ? "Collapse details" : "Expand details"}
            className="shrink-0 -mr-1 -mt-1 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronDown
              size={16}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>
      {meta && <div className="mt-1 text-xs text-gray-500">{meta}</div>}
      {actions && (
        <div
          className="mt-2 flex flex-wrap items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
      {hasDetails && open && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-1.5">
          {details}
        </div>
      )}
    </div>
  );

  const wrapperClass = cn(
    "flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3.5",
    selected && "border-[#2596be] bg-[#2596be]/5",
    href && "hover:border-gray-300 active:bg-gray-50 transition-colors",
    className,
  );

  const checkbox = hasCheckbox ? (
    <input
      type="checkbox"
      checked={!!selected}
      onChange={(e) => onSelect?.(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select row"
      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2596be] focus:ring-[#2596be] shrink-0"
    />
  ) : null;

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {checkbox}
        {body}
      </Link>
    );
  }

  return (
    <div className={wrapperClass}>
      {checkbox}
      {body}
    </div>
  );
}
