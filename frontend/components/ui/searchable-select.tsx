"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  swatch?: string;      // hex color for color options
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string, label: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  searchable?: boolean;       // auto-enabled when > 6 options
  searchPlaceholder?: string;
  creatable?: boolean;        // show "+ Add" when no match
  onCreateLabel?: string;     // e.g. "Add new brand"
  onCreate?: (value: string) => void;
  size?: "sm" | "default";    // sm = compact inline
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  hint,
  error,
  searchable,
  searchPlaceholder = "Search...",
  creatable = false,
  onCreateLabel = "Add",
  onCreate,
  size = "default",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable ?? options.length > 6;
  const selected = options.find(o => o.value === value);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, showSearch]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const exactMatch = search
    ? options.some(o => o.label.toLowerCase() === search.toLowerCase())
    : true;

  const isSm = size === "sm";

  return (
    <div className={cn("flex flex-col gap-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-800">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
          className={cn(
            "w-full text-sm bg-white border border-gray-200 rounded-lg outline-none text-left flex items-center justify-between transition-colors",
            "hover:border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10",
            disabled && "bg-gray-50 text-gray-400 cursor-not-allowed",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
            open && "border-gray-900 ring-2 ring-gray-900/10",
            isSm ? "h-8 px-2.5 text-xs" : "h-10 px-3",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.swatch && (
              <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                style={{ backgroundColor: selected.swatch }} />
            )}
            <span className={selected ? "text-gray-900" : "text-gray-400"}>
              {selected?.label || placeholder}
            </span>
          </span>
          <ChevronDown size={isSm ? 12 : 14}
            className={cn("text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className={cn(
            "absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[200px]",
            isSm ? "z-40" : "z-30"
          )}>
            {showSearch && (
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center gap-2 px-2.5 h-9 border border-gray-200 rounded-lg focus-within:border-gray-400 transition-colors">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto">
              {filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => {
                    onChange(o.value, o.label);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors",
                    "hover:bg-gray-50",
                    value === o.value && "bg-gray-50 font-medium",
                    o.disabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {o.swatch && (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                        style={{ backgroundColor: o.swatch }} />
                    )}
                    {o.label}
                  </span>
                  {value === o.value && <Check size={14} className="text-green-600 shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && !search && (
                <p className="px-3 py-3 text-xs text-gray-400">No options available</p>
              )}
              {filtered.length === 0 && search && !creatable && (
                <p className="px-3 py-3 text-xs text-gray-400">No results for &quot;{search}&quot;</p>
              )}
              {search && !exactMatch && creatable && (
                <button
                  type="button"
                  onClick={() => {
                    if (onCreate) onCreate(search);
                    else onChange(search, search);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full px-3 py-2.5 text-sm text-left hover:bg-blue-50 text-blue-600 font-medium border-t border-gray-100 flex items-center gap-2"
                >
                  <Plus size={14} /> {onCreateLabel} &quot;{search}&quot;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
