"use client";
import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload, Plus, X, ChevronDown, ChevronRight, Trash2, Image,
  RefreshCw, Check, Package, Search, GripVertical,
  FileDown, Link2, Monitor, ChevronLeft, ArrowRight, Eye,
  Loader2, AlertCircle, ArrowUp, ArrowDown,
} from "lucide-react";
import { PRODUCT_CATEGORIES, PRODUCT_BRANDS } from "@/lib/product-data";
import {
  productsApi, categoriesApi, brandsApi,
  type ProductCreatePayload, type ProductUpdatePayload,
} from "@/lib/api/services/vendor-products";
import { vendorAuthApi } from "@/lib/api/services/vendor-auth";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProductCategory as ApiCategory, Brand as ApiBrand } from "@/lib/api/types";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

/* ── Data: Colors with swatches ─────────────────────────────────────── */
const PREDEFINED_COLORS: { name: string; hex: string }[] = [
  { name: 'Beige',      hex: '#F5F5DC' },
  { name: 'Black',      hex: '#000000' },
  { name: 'Blue',       hex: '#2563EB' },
  { name: 'Bronze',     hex: '#CD7F32' },
  { name: 'Brown',      hex: '#8B4513' },
  { name: 'Burgundy',   hex: '#800020' },
  { name: 'Camel',      hex: '#C19A6B' },
  { name: 'Charcoal',   hex: '#36454F' },
  { name: 'Clear',      hex: '#FFFFFF' },
  { name: 'Coral',      hex: '#FF7F50' },
  { name: 'Cream',      hex: '#FFFDD0' },
  { name: 'Gold',       hex: '#D4A017' },
  { name: 'Gray',       hex: '#808080' },
  { name: 'Green',      hex: '#16A34A' },
  { name: 'Ivory',      hex: '#FFFFF0' },
  { name: 'Khaki',      hex: '#C3B091' },
  { name: 'Lavender',   hex: '#E6E6FA' },
  { name: 'Magenta',    hex: '#FF00FF' },
  { name: 'Maroon',     hex: '#800000' },
  { name: 'Mint',       hex: '#98FF98' },
  { name: 'Multicolor', hex: 'multi' },
  { name: 'Navy',       hex: '#000080' },
  { name: 'Off-White',  hex: '#FAF9F6' },
  { name: 'Olive',      hex: '#808000' },
  { name: 'Orange',     hex: '#EA580C' },
  { name: 'Peach',      hex: '#FFDAB9' },
  { name: 'Pink',       hex: '#EC4899' },
  { name: 'Purple',     hex: '#7C3AED' },
  { name: 'Red',        hex: '#DC2626' },
  { name: 'Rose Gold',  hex: '#B76E79' },
  { name: 'Silver',     hex: '#C0C0C0' },
  { name: 'Sky Blue',   hex: '#87CEEB' },
  { name: 'Teal',       hex: '#0D9488' },
  { name: 'Turquoise',  hex: '#40E0D0' },
  { name: 'White',      hex: '#FFFFFF' },
  { name: 'Wine',       hex: '#722F37' },
  { name: 'Yellow',     hex: '#EAB308' },
];

/* ── Data: Option value presets ─────────────────────────────────────── */
const OPTION_VALUE_PRESETS: Record<string, string[]> = {
  'Size':            ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Shoe size':       ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  'Shoe size (UK)':  ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  'Shoe size (US)':  ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12', '13'],
  'Target gender':   ['Unisex', 'Female', 'Male', 'Other'],
  'Material':        ['Cotton', 'Silk', 'Chiffon', 'Polyester', 'Linen', 'Wool', 'Denim', 'Leather', 'Satin', 'Nylon', 'Georgette', 'Muslin'],
  'Age group':       ['Newborn', 'Infant', 'Toddler', 'Kids', 'Teen', 'Adult'],
  'Closure type':    ['Lace-Up', 'Slip-On', 'Velcro', 'Buckle', 'Zipper', 'Button'],
  'Occasion style':  ['Casual', 'Formal', 'Party', 'Wedding', 'Sports', 'Ethnic', 'Office'],
  'Heel height type':['Flat', 'Low', 'Medium', 'High', 'Stiletto', 'Platform', 'Wedge'],
  'Shoe fit':        ['Regular', 'Wide', 'Narrow', 'Extra Wide'],
  'Toe style':       ['Round', 'Pointed', 'Open', 'Square', 'Peep'],
  'Storage':         ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
  'RAM':             ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB'],
  'Screen size':     ['5.5"', '6.1"', '6.4"', '6.7"', '13"', '14"', '15.6"', '17"'],
  'Weight':          ['250g', '500g', '1kg', '2kg', '5kg'],
  'Pack size':       ['Single', 'Pack of 2', 'Pack of 3', 'Pack of 5', 'Pack of 10'],
  'Skin type':       ['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive', 'All skin types'],
  'Printing':        ['Front', 'Back', 'Front & Back'],
};

/* ── Data: Category -> suggested options ─────────────────────────────── */
const CATEGORY_OPTION_MAP: Record<number, string[]> = {
  270: ['Color', 'Size', 'Target gender', 'Material', 'Occasion style'],
  290: ['Color', 'Size', 'Target gender', 'Material', 'Occasion style'],
  309: ['Color', 'Target gender', 'Material'],
  326: ['Size', 'Skin type', 'Target gender'],
  345: ['Color', 'Storage', 'RAM', 'Screen size'],
  358: ['Color'],
  374: ['Color', 'Size'],
  395: ['Size', 'Age group', 'Color', 'Target gender'],
  408: ['Color', 'Size', 'Material'],
  429: ['Color', 'Size', 'Target gender'],
  447: ['Weight', 'Pack size'],
  469: ['Color', 'Size'],
  482: [],
  498: [],
};

const SHOE_SUBCATEGORY_IDS = [285, 286, 287, 303, 304, 441];
const SHOE_OPTIONS = ['Color', 'Shoe size', 'Target gender', 'Closure type', 'Heel height type', 'Shoe fit', 'Toe style', 'Material'];

const ALL_OPTION_NAMES = [
  'Color', 'Size', 'Shoe size', 'Shoe size (UK)', 'Shoe size (US)', 'Target gender',
  'Material', 'Age group', 'Closure type', 'Occasion style', 'Heel height type',
  'Shoe fit', 'Toe style', 'Storage', 'RAM', 'Screen size', 'Weight', 'Pack size',
  'Skin type', 'Printing',
];

/* ── Types ──────────────────────────────────────────────────────────── */
interface VariantOption {
  id: string;
  name: string;
  values: string[];
}

interface VariantRow {
  id: string;
  options: Record<string, string>;
  price: string;
  discount: string;
  discountType: 'flat' | 'percent';
  cost: string;
  stock: string;
  sku: string;
  barcode: string;
  imageUrl: string | null;
}

/* ── Unit Price Measurement Data ─────────────────────────────────────── */
const UNIT_GROUPS = [
  { label: 'Per item', units: [{ name: 'Item', abbr: 'item' }] },
  { label: 'Weight', units: [
    { name: 'Milligram', abbr: 'mg' },
    { name: 'Gram', abbr: 'g' },
    { name: 'Kilogram', abbr: 'kg' },
  ]},
  { label: 'Volume', units: [
    { name: 'Milliliter', abbr: 'ml' },
    { name: 'Centiliter', abbr: 'cl' },
    { name: 'Liter', abbr: 'L' },
    { name: 'Cubic meter', abbr: 'm\u00B3' },
  ]},
  { label: 'Size', units: [
    { name: 'Millimeter', abbr: 'mm' },
    { name: 'Centimeter', abbr: 'cm' },
    { name: 'Meter', abbr: 'm' },
  ]},
  { label: 'Area', units: [
    { name: 'Square meter', abbr: 'm\u00B2' },
  ]},
];

/* ── EAN-13 generator ────────────────────────────────────────────────── */
let _eanSeq = 0;
function generateEan13(productBase?: number): string {
  const prefix = '880';
  const store  = '0001';
  const seq    = productBase != null
    ? String(productBase + (++_eanSeq)).padStart(5, '0')
    : String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  const digits = (prefix + store + seq).split('').map(Number);
  const check  = (10 - (digits.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
  return digits.join('') + check;
}

function generateVariantBarcodes(count: number): string[] {
  const base = Math.floor(Math.random() * 90000) + 10000;
  return Array.from({ length: count }, (_, i) => {
    const prefix = '880';
    const store  = '0001';
    const seq    = String(base + i).padStart(5, '0');
    const digits = (prefix + store + seq).split('').map(Number);
    const check  = (10 - (digits.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
    return digits.join('') + String(check);
  });
}

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<string[][]>((acc, arr) => acc.flatMap(a => arr.map(v => [...a, v])), [[]]);
}

function resolveColorHex(name: string, customColors: Record<string, string>): string | undefined {
  return customColors[name] || PREDEFINED_COLORS.find(c => c.name === name)?.hex;
}


/* ── Color Swatch ───────────────────────────────────────────────────── */
function ColorSwatch({ hex, size = 16 }: { hex: string; size?: number }) {
  if (hex === 'multi') {
    return (
      <span className="inline-block rounded-full border border-gray-300 shrink-0"
        style={{ width: size, height: size, background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
    );
  }
  return (
    <span className="inline-block rounded-full border border-gray-300 shrink-0"
      style={{ width: size, height: size, backgroundColor: hex }} />
  );
}

/* ── Value Picker Dropdown (non-color) ──────────────────────────────── */
function ValuePickerDropdown({
  optionName, selectedValues, onToggle, onAddCustom, onClose, suggested,
}: {
  optionName: string; selectedValues: string[]; onToggle: (val: string) => void;
  onAddCustom: (val: string) => void; onClose: () => void; suggested?: string;
}) {
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const presetValues = OPTION_VALUE_PRESETS[optionName] || [];
  const filtered = search
    ? presetValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
    : presetValues;

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-72 max-h-80 flex flex-col">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search" autoFocus
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-gray-400" />
        </div>
      </div>

      {suggested && !selectedValues.includes(suggested) && !search && (
        <div className="px-2 pt-2">
          <button type="button" onClick={() => onToggle(suggested)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-left">
            <input type="checkbox" checked={false} readOnly className="rounded" />
            <span className="text-xs text-gray-800">{suggested}</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">Suggested</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {filtered.length > 0 && (
          <>
            {!search && <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pt-1 pb-1">Default entries</p>}
            {filtered.map(val => (
              <button key={val} type="button" onClick={() => onToggle(val)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                <input type="checkbox" checked={selectedValues.includes(val)} readOnly className="rounded" />
                <span className="text-xs text-gray-800">{val}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        <div className="flex items-center gap-2">
          <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { onAddCustom(customInput.trim()); setCustomInput(''); } }}
            placeholder="Add new entry"
            className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400" />
          <button type="button"
            onClick={() => { if (customInput.trim()) { onAddCustom(customInput.trim()); setCustomInput(''); } }}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Color Picker Dropdown ──────────────────────────────────────────── */
function ColorPickerDropdown({
  selectedValues, customColors, onToggle, onAddColor, onClose,
}: {
  selectedValues: string[]; customColors: Record<string, string>;
  onToggle: (name: string) => void; onAddColor: (name: string, hex: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newHex, setNewHex] = useState('#000000');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const customEntries = Object.entries(customColors).map(([name, hex]) => ({ name, hex }));
  const allColors = [...customEntries, ...PREDEFINED_COLORS.filter(c => !customColors[c.name])];
  const filtered = search
    ? allColors.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.hex.toLowerCase().includes(search.toLowerCase()))
    : allColors;

  const handleCreate = () => {
    const name = newName.trim();
    let hex = newHex.trim();
    if (!name) return;
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    onAddColor(name, hex);
    setNewName('');
    setNewHex('#000000');
  };

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-80 max-h-[420px] flex flex-col">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or hex..." autoFocus
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-gray-400" />
        </div>
      </div>

      {customEntries.length > 0 && !search && (
        <div className="px-2 pt-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pb-1">Your saved colors</p>
          {customEntries.map(c => (
            <button key={c.name} type="button" onClick={() => onToggle(c.name)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left">
              <input type="checkbox" checked={selectedValues.includes(c.name)} readOnly className="rounded" />
              <ColorSwatch hex={c.hex} />
              <span className="text-xs text-gray-800">{c.name}</span>
              <span className="ml-auto text-[10px] font-mono text-gray-400">{c.hex}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {!search && customEntries.length > 0 && (
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pt-1 pb-1">Default colors</p>
        )}
        {(search ? filtered : filtered.filter(c => !customColors[c.name])).map(c => (
          <button key={c.name} type="button" onClick={() => onToggle(c.name)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left">
            <input type="checkbox" checked={selectedValues.includes(c.name)} readOnly className="rounded" />
            <ColorSwatch hex={c.hex} />
            <span className="text-xs text-gray-800">{c.name}</span>
            <span className="ml-auto text-[10px] font-mono text-gray-400">{c.hex}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-100 p-2.5">
        <p className="text-[10px] font-medium text-gray-500 mb-1.5">Create new color</p>
        <div className="flex items-center gap-2">
          <input type="color" value={newHex} onChange={e => setNewHex(e.target.value)}
            className="h-8 w-8 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0" title="Pick color" />
          <input type="text" value={newHex}
            onChange={e => {
              let v = e.target.value;
              if (v && !v.startsWith('#')) v = '#' + v;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') setNewHex(v || '#000000');
            }}
            placeholder="#000000" maxLength={7}
            className="w-[76px] h-8 px-2 text-xs font-mono border border-gray-200 rounded-lg outline-none focus:border-gray-400 shrink-0" />
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Color name"
            className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400" />
          <button type="button" onClick={handleCreate}
            className="h-8 px-2.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shrink-0">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Option Dropdown ────────────────────────────────────────────── */
function AddOptionDropdown({
  recommended, usedNames, onSelect, onClose,
}: {
  recommended: string[]; usedNames: string[];
  onSelect: (name: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const available = ALL_OPTION_NAMES.filter(n => !usedNames.includes(n));
  const recFiltered = recommended.filter(n => !usedNames.includes(n));
  const otherFiltered = available.filter(n => !recommended.includes(n));
  const filterFn = (n: string) => !search || n.toLowerCase().includes(search.toLowerCase());

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-64 max-h-80 flex flex-col">
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search" autoFocus
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {recFiltered.filter(filterFn).length > 0 && (
          <>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pt-1 pb-1">Recommended</p>
            {recFiltered.filter(filterFn).map(name => (
              <button key={name} type="button" onClick={() => { onSelect(name); onClose(); }}
                className="w-full text-left px-2.5 py-2 text-xs text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                {name}
              </button>
            ))}
          </>
        )}
        {otherFiltered.filter(filterFn).length > 0 && (
          <>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pt-2 pb-1">
              {recFiltered.length > 0 ? 'Other options' : 'Available options'}
            </p>
            {otherFiltered.filter(filterFn).map(name => (
              <button key={name} type="button" onClick={() => { onSelect(name); onClose(); }}
                className="w-full text-left px-2.5 py-2 text-xs text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                {name}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-gray-100 p-2">
        <button type="button"
          onClick={() => { onSelect(search.trim() || 'Custom'); onClose(); }}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Plus size={13} /> Create custom option{search.trim() ? `: "${search.trim()}"` : ''}
        </button>
      </div>
    </div>
  );
}

/* ── Option Builder ─────────────────────────────────────────────────── */
function OptionBuilder({
  option, onUpdate, onRemove, recommended, customColors, onAddColor,
}: {
  option: VariantOption; onUpdate: (opt: VariantOption) => void; onRemove: () => void;
  recommended: string[]; customColors: Record<string, string>;
  onAddColor: (name: string, hex: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isColor = option.name === 'Color';
  const getHex = (name: string) => resolveColorHex(name, customColors);

  const toggleValue = (val: string) => {
    const has = option.values.includes(val);
    onUpdate({ ...option, values: has ? option.values.filter(v => v !== val) : [...option.values, val] });
  };

  const addCustomValue = (val: string) => {
    if (!option.values.includes(val)) {
      onUpdate({ ...option, values: [...option.values, val] });
    }
  };

  const suggestedValue = recommended.length > 0 && option.values.length === 0
    ? (isColor ? 'Black' : (OPTION_VALUE_PRESETS[option.name]?.[0] || undefined))
    : undefined;

  return (
    <div className="border border-gray-200 rounded-xl p-4 relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-gray-300 cursor-grab"><GripVertical size={16} /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{option.name}</p>
        </div>
        <button type="button" onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[40px] cursor-text hover:border-gray-300 transition-colors"
          onClick={() => setShowPicker(true)}
        >
          {option.values.map(v => (
            <span key={v} className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
              {isColor && getHex(v) && <ColorSwatch hex={getHex(v)!} size={12} />}
              {v}
              <button type="button" onClick={e => { e.stopPropagation(); toggleValue(v); }}>
                <X size={10} className="text-gray-400 hover:text-gray-700" />
              </button>
            </span>
          ))}
          {option.values.length === 0 && (
            <span className="text-xs text-gray-400">
              {isColor ? 'Pick colors or paste a hex code' : `Add ${option.name.toLowerCase()}`}
            </span>
          )}
        </div>

        {showPicker && isColor && (
          <ColorPickerDropdown
            selectedValues={option.values}
            customColors={customColors}
            onToggle={toggleValue}
            onAddColor={(name, hex) => { onAddColor(name, hex); addCustomValue(name); }}
            onClose={() => setShowPicker(false)}
          />
        )}
        {showPicker && !isColor && (
          <ValuePickerDropdown
            optionName={option.name}
            selectedValues={option.values}
            onToggle={toggleValue}
            onAddCustom={addCustomValue}
            onClose={() => setShowPicker(false)}
            suggested={suggestedValue}
          />
        )}
      </div>

      {option.values.length === 0 && (isColor || OPTION_VALUE_PRESETS[option.name]) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] text-gray-400 mr-0.5">Quick add:</span>
          {(isColor
            ? ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow']
            : (OPTION_VALUE_PRESETS[option.name] || []).slice(0, 6)
          ).map(p => (
            <button key={p} type="button" onClick={() => addCustomValue(p)}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-dashed border-gray-300 rounded text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
              {isColor && getHex(p) && <ColorSwatch hex={getHex(p)!} size={10} />}
              + {p}
            </button>
          ))}
          <button type="button"
            onClick={() => onUpdate({ ...option, values: isColor ? ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow'] : (OPTION_VALUE_PRESETS[option.name] || []) })}
            className="px-2 py-0.5 text-[11px] bg-gray-100 rounded text-gray-600 hover:bg-gray-200 font-medium transition-colors">
            Add all
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Bulk Edit Modal ────────────────────────────────────────────────── */
function BulkEditModal({
  title, field, variants, selected, onApply, onClose,
}: {
  title: string; field: 'price' | 'stock' | 'sku' | 'cost'; variants: VariantRow[];
  selected: Set<string>;
  onApply: (updates: { field: string; values: Record<string, string> }[]) => void;
  onClose: () => void;
}) {
  const items = variants.filter(v => selected.has(v.id));
  const [bulkVal, setBulkVal] = useState('');
  const [bulkDiscount, setBulkDiscount] = useState('');
  const [bulkDiscountType, setBulkDiscountType] = useState<'flat' | 'percent'>('flat');
  const [perItem, setPerItem] = useState<Record<string, string>>(
    Object.fromEntries(items.map(v => [v.id, v[field]]))
  );
  const [perDiscount, setPerDiscount] = useState<Record<string, string>>(
    Object.fromEntries(items.map(v => [v.id, v.discount]))
  );
  const [perDiscountType, setPerDiscountType] = useState<Record<string, 'flat' | 'percent'>>(
    Object.fromEntries(items.map(v => [v.id, v.discountType]))
  );
  const label = (v: VariantRow) => Object.values(v.options).join(' / ');
  const isPrice = field === 'price';
  const isSku = field === 'sku';
  const isCost = field === 'cost';
  const isMoney = isPrice || isCost;

  const applyAll = () => {
    if (!bulkVal && !isPrice) return;
    const u = { ...perItem };
    items.forEach(v => { if (bulkVal) u[v.id] = bulkVal; });
    setPerItem(u);
    if (isPrice && bulkDiscount) {
      const d = { ...perDiscount };
      const dt = { ...perDiscountType };
      items.forEach(v => { d[v.id] = bulkDiscount; dt[v.id] = bulkDiscountType; });
      setPerDiscount(d);
      setPerDiscountType(dt);
    }
  };

  const handleDone = () => {
    const updates: { field: string; values: Record<string, string> }[] = [
      { field, values: perItem },
    ];
    if (isPrice) {
      updates.push({ field: 'discount', values: perDiscount });
      updates.push({ field: 'discountType', values: Object.fromEntries(Object.entries(perDiscountType).map(([k, v]) => [k, v])) });
    }
    onApply(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* Bulk apply section */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            {isPrice ? 'Set price and discount for all selected variants' :
             isCost ? 'Set cost per item for all selected variants' :
             isSku ? 'Set a base SKU prefix for all selected variants' :
             'Set quantity for all selected variants'}
          </p>
          {isPrice ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-gray-500 mb-1 block">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#2547;</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={bulkVal}
                    onChange={e => setBulkVal(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-gray-500 mb-1 block">
                  Discount ({bulkDiscountType === 'flat' ? 'flat' : '%'})
                </label>
                <div className="flex gap-0">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {bulkDiscountType === 'flat' ? '\u09F3' : '%'}
                    </span>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={bulkDiscount} onChange={e => setBulkDiscount(e.target.value)}
                      className="w-full h-9 pl-8 pr-2 text-sm border border-gray-200 rounded-l-lg focus:border-gray-400 outline-none" />
                  </div>
                  <button type="button" onClick={() => setBulkDiscountType(bulkDiscountType === 'flat' ? 'percent' : 'flat')}
                    className="h-9 px-2 bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap">
                    {bulkDiscountType === 'flat' ? '\u09F3' : '%'}
                  </button>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0 h-9" onClick={applyAll}>Apply to all</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                {isCost && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#2547;</span>}
                <input type={isSku ? 'text' : 'number'} min="0" step={isSku ? undefined : isCost ? '0.01' : '1'}
                  placeholder={isSku ? 'e.g. KRT' : '0'} value={bulkVal} onChange={e => setBulkVal(e.target.value)}
                  className={`w-full h-9 ${isCost ? 'pl-8 pr-3' : 'px-3'} text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none`} />
              </div>
              <Button variant="secondary" size="sm" onClick={applyAll}>Apply to all</Button>
            </div>
          )}
        </div>

        {/* Column headers for price modal */}
        {isPrice && (
          <div className="flex items-center gap-3 px-5 pt-3 pb-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase flex-1">Variant</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-medium text-gray-400 uppercase w-24 text-center">Price</span>
              <span className="text-[10px] font-medium text-gray-400 uppercase w-24 text-center">Discount</span>
            </div>
          </div>
        )}

        {/* Per-variant list */}
        <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-2">
          {items.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3">
              <p className="text-xs text-gray-700 flex-1 min-w-0 truncate">{label(v)}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Main field */}
                <div className="relative">
                  {isMoney && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">&#2547;</span>}
                  <input type={isSku ? 'text' : 'number'} min="0" step={isMoney ? '0.01' : '1'}
                    placeholder={isSku ? `${bulkVal || 'SKU'}-${String(i + 1).padStart(3, '0')}` : '0'}
                    value={perItem[v.id] || ''} onChange={e => setPerItem(p => ({ ...p, [v.id]: e.target.value }))}
                    className={`${isSku ? 'w-28' : 'w-24'} h-8 pr-2 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none ${isMoney ? 'pl-5' : 'pl-2.5'}`} />
                </div>
                {/* Discount for price -- same width as price */}
                {isPrice && (
                  <div className="flex gap-0">
                    <div className="relative">
                      <input type="number" min="0" step="0.01"
                        placeholder={perDiscountType[v.id] === 'flat' ? 'Flat \u09F3' : 'Percent %'}
                        value={perDiscount[v.id] || ''} onChange={e => setPerDiscount(p => ({ ...p, [v.id]: e.target.value }))}
                        className="w-[76px] h-8 pl-2 pr-1 text-xs border border-gray-200 rounded-l-lg focus:border-gray-400 outline-none" />
                    </div>
                    <button type="button" onClick={() => setPerDiscountType(p => ({ ...p, [v.id]: p[v.id] === 'flat' ? 'percent' : 'flat' }))}
                      className="h-8 px-1.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap">
                      {perDiscountType[v.id] === 'flat' ? '\u09F3' : '%'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleDone}><Check size={13} /> Done</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Pricing Section (lifted to accept state props) ──────────────────── */
function PricingSection({
  price, setPrice, comparePrice, setComparePrice, discountType, setDiscountType,
  costPrice, setCostPrice, taxable, setTaxable,
  unitAmount, setUnitAmount, unitMeasure, setUnitMeasure,
  baseMeasure, setBaseMeasure, baseMeasureUnit, setBaseMeasureUnit,
}: {
  price: string; setPrice: (v: string) => void;
  comparePrice: string; setComparePrice: (v: string) => void;
  discountType: 'flat' | 'percent'; setDiscountType: (v: 'flat' | 'percent') => void;
  costPrice: string; setCostPrice: (v: string) => void;
  taxable: boolean; setTaxable: (v: boolean) => void;
  unitAmount: string; setUnitAmount: (v: string) => void;
  unitMeasure: string; setUnitMeasure: (v: string) => void;
  baseMeasure: string; setBaseMeasure: (v: string) => void;
  baseMeasureUnit: string; setBaseMeasureUnit: (v: string) => void;
}) {
  const [showUnitPopover, setShowUnitPopover] = useState(false);
  const unitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (unitRef.current && !unitRef.current.contains(e.target as Node)) setShowUnitPopover(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const p = parseFloat(price) || 0;
  const c = parseFloat(costPrice) || 0;
  const d = parseFloat(comparePrice) || 0;
  // Effective selling price after the configured discount — that's what
  // the customer actually pays, so margin/profit must be computed against
  // it, not against the pre-discount list price.
  const effectivePrice = d > 0
    ? Math.max(0, discountType === 'percent' ? p - (p * d / 100) : p - d)
    : p;
  const profit = effectivePrice > 0 && c > 0 ? effectivePrice - c : null;
  const margin = effectivePrice > 0 && c > 0 ? Math.round(((effectivePrice - c) / effectivePrice) * 100) : null;

  const unitAbbr = UNIT_GROUPS.flatMap(g => g.units).find(u => u.abbr === baseMeasureUnit)?.abbr || 'item';
  const unitPriceCalc = p > 0 && parseFloat(unitAmount) > 0 && parseFloat(baseMeasure) > 0
    ? (p / parseFloat(unitAmount) * parseFloat(baseMeasure)).toFixed(2)
    : null;

  const getUnitGroupForAbbr = (abbr: string) => UNIT_GROUPS.find(g => g.units.some(u => u.abbr === abbr));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Selling price */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Selling Price (BDT) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#2547;</span>
            <input type="number" min="0" placeholder="0.00" value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">The price your customers will see</p>
        </div>

        {/* Discount */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Discount</label>
          <div className="flex gap-0">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {discountType === 'flat' ? '\u09F3' : '%'}
              </span>
              <input type="number" min="0" placeholder="0.00" value={comparePrice}
                onChange={e => setComparePrice(e.target.value)}
                className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-l-lg focus:border-gray-400 outline-none" />
            </div>
            <div className="flex border border-l-0 border-gray-200 rounded-r-lg overflow-hidden">
              <button type="button" onClick={() => setDiscountType('flat')}
                className={`px-3 h-10 text-xs font-medium transition-colors ${
                  discountType === 'flat' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}>{'\u09F3'}</button>
              <button type="button" onClick={() => setDiscountType('percent')}
                className={`px-3 h-10 text-xs font-medium transition-colors border-l border-gray-200 ${
                  discountType === 'percent' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}>%</button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {discountType === 'flat'
              ? 'Flat amount off the selling price'
              : 'Percentage off the selling price'}
            {comparePrice && parseFloat(price) > 0 && (
              <>
                {' -- '}
                <span className="font-bold text-green-600">
                  Final: &#2547;{(discountType === 'percent'
                    ? parseFloat(price) * (1 - (parseFloat(comparePrice) || 0) / 100)
                    : parseFloat(price) - (parseFloat(comparePrice) || 0)
                  ).toFixed(2)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Unit price -- hidden for now, may be needed later for grocery/weight-based products
        <div className="col-span-2 relative" ref={unitRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Unit Price</label>
          <button type="button" onClick={() => setShowUnitPopover(!showUnitPopover)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white hover:border-gray-300 outline-none text-left flex items-center justify-between transition-colors">
            <span className={unitPriceCalc ? 'text-gray-900' : 'text-gray-400'}>
              {unitPriceCalc ? `\u09F3${unitPriceCalc}/${unitAbbr}` : 'Set unit price...'}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          <p className="text-[11px] text-gray-400 mt-1">Optional: helps customers compare value (e.g. price per kg)</p>

          {showUnitPopover && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4" style={{ width: 375 }}>
              <p className="text-[11px] text-gray-500 mb-3">Unit price helps customers compare products of different sizes. Example: a 500g bag of rice at &#2547;200 = &#2547;400/kg</p>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">How much is in the package?</label>
                <p className="text-[10px] text-gray-400 mb-1.5">e.g. 500 grams, 1 liter, 2 items</p>
                <div className="flex gap-2">
                  <input type="number" min="0" placeholder="e.g. 500" value={unitAmount}
                    onChange={e => setUnitAmount(e.target.value)}
                    className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  <SearchableSelect
                    options={UNIT_GROUPS.flatMap(g => [
                      { value: `__group_${g.label}`, label: g.label, disabled: true },
                      ...g.units.map(u => ({ value: u.abbr, label: `${u.name} (${u.abbr})` })),
                    ])}
                    value={unitMeasure}
                    onChange={(v) => { setUnitMeasure(v); setBaseMeasureUnit(v); }}
                    searchable={false}
                    size="sm"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Show price per?</label>
                <p className="text-[10px] text-gray-400 mb-1.5">e.g. per 1 kg, per 1 liter</p>
                <div className="flex gap-2">
                  <input type="number" min="0" placeholder="1" value={baseMeasure}
                    onChange={e => setBaseMeasure(e.target.value)}
                    className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                  <SearchableSelect
                    options={(getUnitGroupForAbbr(unitMeasure)?.units || UNIT_GROUPS[0].units).map(u => ({
                      value: u.abbr, label: `${u.name} (${u.abbr})`,
                    }))}
                    value={baseMeasureUnit}
                    onChange={(v) => setBaseMeasureUnit(v)}
                    searchable={false}
                    size="sm"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button type="button"
                  onClick={() => { setUnitAmount(''); setBaseMeasure('1'); setUnitMeasure('item'); setBaseMeasureUnit('item'); }}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowUnitPopover(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => setShowUnitPopover(false)}>Done</Button>
                </div>
              </div>
            </div>
          )}
        </div>
        */}
      </div>

      {/* Tax */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <input type="checkbox" id="taxable" checked={taxable} onChange={e => setTaxable(e.target.checked)} className="rounded" />
        <label htmlFor="taxable" className="text-sm text-gray-700">Charge tax on this product</label>
      </div>
      <p className="text-[11px] text-gray-400 -mt-3">Enable this if your product is subject to sales tax or VAT</p>

      {/* Cost + Profit + Margin strip */}
      <div className="pt-4 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-700 mb-2">Cost per item</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500">Cost</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">&#2547;</span>
              <input type="number" min="0" placeholder="0.00" value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                className="w-20 h-7 pl-5 pr-1 text-xs border border-gray-200 rounded bg-white focus:border-gray-400 outline-none" />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
            profit === null ? 'bg-gray-50 border-gray-100' :
            profit > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
          }`}>
            <span className="text-xs text-gray-500">Profit</span>
            <span className={`text-xs font-semibold ${
              profit === null ? 'text-gray-400' : profit > 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {profit === null ? '--' : `\u09F3${profit > 0 ? '+' : ''}${profit.toFixed(2)}`}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${
            margin === null ? 'bg-gray-50 border-gray-100' :
            margin >= 30 ? 'bg-green-50 border-green-100' :
            margin >= 10 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'
          }`}>
            <span className="text-xs text-gray-500">Margin</span>
            <span className={`text-xs font-semibold ${
              margin === null ? 'text-gray-400' :
              margin >= 30 ? 'text-green-700' :
              margin >= 10 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {margin === null ? '--' : `${margin}%`}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Cost is not shown to customers. It helps you track profit margins.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STEPPER STEPS
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { num: 1, label: 'Describe', key: 'describe' },
  { num: 2, label: 'Price', key: 'price' },
  { num: 3, label: 'Stock', key: 'stock' },
  { num: 4, label: 'Publish', key: 'publish' },
] as const;

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
function AddProductWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const editIdNum = editId ? Number(editId) : null;
  const isEditMode = editIdNum !== null && !Number.isNaN(editIdNum);
  const queryClient = useQueryClient();

  /* ── Wizard step ─────────────────────────────────────────────────── */
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  /* ── Save state ──────────────────────────────────────────────────── */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /* ── Step 1: Describe ────────────────────────────────────────────── */
  const [productType, setProductType] = useState<'physical' | 'digital'>('physical');
  const [productName, setProductName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');

  /* ── Custom tabs (vendor-defined, bilingual) ─────────────────────── */
  interface CustomTabRow {
    rowId: string; // local-only key for React reconciliation
    name_en: string;
    name_bn: string;
    content_en: string;
    content_bn: string;
  }
  const newTabId = () => 'tab_' + Math.random().toString(36).slice(2, 10);
  const [customTabs, setCustomTabs] = useState<CustomTabRow[]>([]);

  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);

  /* ── Step 2: Price ───────────────────────────────────────────────── */
  const [hasVariantsToggle, setHasVariantsToggle] = useState(false);
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [costPrice, setCostPrice] = useState('');
  const [taxable, setTaxable] = useState(false);
  const [unitAmount, setUnitAmount] = useState('');
  const [unitMeasure, setUnitMeasure] = useState('item');
  const [baseMeasure, setBaseMeasure] = useState('1');
  const [baseMeasureUnit, setBaseMeasureUnit] = useState('item');

  /* ── Variant state ───────────────────────────────────────────────── */
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<'price' | 'stock' | 'sku' | 'cost' | null>(null);
  const [showAddOption, setShowAddOption] = useState(false);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  /* ── Step 3: Stock & Delivery ────────────────────────────────────── */
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [trackInventory, setTrackInventory] = useState(true);
  const [digitalDelivery, setDigitalDelivery] = useState<'upload' | 'link'>('upload');
  const [digitalFileName, setDigitalFileName] = useState('');
  const [digitalExternalUrl, setDigitalExternalUrl] = useState('');
  const [downloadLimit, setDownloadLimit] = useState('5');
  const [downloadExpiry, setDownloadExpiry] = useState('30');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  /* ── Step 4: Publish ─────────────────────────────────────────────── */
  const [status, setStatus] = useState('active');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [productTypeLabel, setProductTypeLabel] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [seoHandle, setSeoHandle] = useState('');
  // Optional YouTube URL — drives the storefront's "Watch Video" button.
  const [videoUrl, setVideoUrl] = useState('');
  // Optional YouTube URL — drives the storefront's "Size Guide" link.
  const [sizeGuideUrl, setSizeGuideUrl] = useState('');

  /* ── API Queries ─────────────────────────────────────────────────── */
  const { data: categoriesData } = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 500 }),
  });
  const apiCategories: ApiCategory[] = categoriesData?.data ?? [];

  const { data: brandsData } = useQuery({
    queryKey: ['vendor', 'brands', { category_id: selectedCatId }],
    queryFn: () => brandsApi.list({
      category_id: selectedCatId ?? undefined,
      per_page: 500,
    }),
    enabled: !!selectedCatId,
  });
  const apiBrands: ApiBrand[] = brandsData?.data ?? [];

  // Vendor's store — used in the SEO preview to show the real domain instead
  // of a hardcoded placeholder.
  const meQuery = useQuery({
    queryKey: ['vendor', 'me'],
    queryFn: () => vendorAuthApi.me(),
    staleTime: 60_000,
    retry: false,
  });
  const seoDomain = (() => {
    const store = meQuery.data?.store;
    if (store?.custom_domain) return store.custom_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return 'wearimpressive.com';
  })();

  const { data: editProductData, isLoading: editLoading, error: editError } = useQuery({
    queryKey: ['vendor', 'product', editIdNum],
    queryFn: () => productsApi.get(editIdNum!),
    enabled: isEditMode,
  });

  /* ── Hydrate form from loaded product (edit mode) ────────────────── */
  useEffect(() => {
    if (!isEditMode || !editProductData || hydrated) return;
    const p = editProductData;
    // Bundles get edited in the dedicated /dashboard/products/add/bundle
    // wizard — they should never land here. Defensively narrow the type
    // so the local state stays valid even if a stale link does route here.
    if (p.product_type === 'bundle') return;
    setProductType(p.product_type);
    setProductName(p.name);
    setShortDesc(p.short_description ?? '');
    setDescription(p.description ?? '');
    if (Array.isArray(p.custom_tabs)) {
      setCustomTabs(
        p.custom_tabs.map((t) => ({
          rowId: newTabId(),
          name_en: t.name_en ?? '',
          name_bn: t.name_bn ?? '',
          content_en: t.content_en ?? '',
          content_bn: t.content_bn ?? '',
        })),
      );
    }
    setProductImages(p.images ?? []);
    setSelectedCatId(p.category_id);
    setSelectedSubCatId(p.sub_category_id);
    setSelectedBrand(p.brand_id ? String(p.brand_id) : null);
    setPrice(p.price ?? '');
    setComparePrice(p.discount ?? '');
    setDiscountType((p.discount_type ?? 'flat') as 'flat' | 'percent');
    setCostPrice(p.cost_price ?? '');
    setTaxable(!!p.is_taxable);
    setHasVariantsToggle(!!p.has_variants);
    setSku(p.sku ?? '');
    setBarcode(p.barcode ?? '');
    setQuantity(String(p.stock ?? ''));
    setTrackInventory(!!p.track_inventory);
    setStatus(p.status);
    setTags(p.tags ?? []);
    setSeoTitle(p.meta_title ?? '');
    setSeoDesc(p.meta_description ?? '');
    setSeoHandle(p.url_handle ?? '');
    setVideoUrl(p.video_url ?? '');
    setSizeGuideUrl(p.size_guide_url ?? '');

    // Hydrate variants (if any)
    if (p.has_variants && p.variants && p.variants.length > 0) {
      const optionMap = new Map<string, Set<string>>();
      p.variants.forEach(v => {
        Object.entries(v.options || {}).forEach(([k, val]) => {
          if (!optionMap.has(k)) optionMap.set(k, new Set());
          optionMap.get(k)!.add(val);
        });
      });
      const rebuiltOpts: VariantOption[] = [];
      optionMap.forEach((vals, name) => {
        rebuiltOpts.push({
          id: `opt-${name}-${Date.now()}`,
          name,
          values: Array.from(vals),
        });
      });
      setOptions(rebuiltOpts);
      const rebuiltVariants: VariantRow[] = p.variants.map((v, i) => ({
        id: `v-${v.id ?? i}`,
        options: v.options || {},
        price: v.price ?? '',
        discount: v.discount ?? '',
        discountType: (v.discount_type ?? 'flat') as 'flat' | 'percent',
        cost: v.cost_price ?? '',
        stock: String(v.stock ?? '0'),
        sku: v.sku ?? '',
        barcode: v.barcode ?? '',
        imageUrl: v.image ?? null,
      }));
      setVariants(rebuiltVariants);
      if (rebuiltOpts.length > 0) setGroupBy(rebuiltOpts[0].name);
    }
    setHydrated(true);
  }, [isEditMode, editProductData, hydrated]);

  /* ── Save mutations ──────────────────────────────────────────────── */
  const buildPayload = (overrideStatus?: 'active' | 'draft' | 'archived'): ProductCreatePayload => {
    const payload: ProductCreatePayload = {
      name: productName.trim(),
      category_id: selectedCatId!,
      sub_category_id: selectedSubCatId,
      brand_id: selectedBrand ? Number(selectedBrand) : null,
      product_type: productType,
      short_description: shortDesc || null,
      description: description || null,
      custom_tabs: customTabs
        .map((t) => ({
          name_en: t.name_en.trim(),
          name_bn: t.name_bn.trim() || null,
          content_en: t.content_en.trim() || null,
          content_bn: t.content_bn.trim() || null,
        }))
        .filter((t) => t.name_en),
      price: price || '0',
      discount: comparePrice || null,
      discount_type: comparePrice ? discountType : null,
      cost_price: costPrice || null,
      sku: sku || null,
      barcode: barcode || null,
      has_variants: hasVariantsToggle,
      track_inventory: trackInventory,
      stock: parseInt(quantity) || 0,
      images: productImages,
      featured_image: productImages[0] ?? null,
      tags,
      meta_title: seoTitle || null,
      meta_description: seoDesc || null,
      url_handle: seoHandle || null,
      video_url: videoUrl.trim() || null,
      size_guide_url: sizeGuideUrl.trim() || null,
      status: (overrideStatus ?? status) as 'active' | 'draft' | 'archived',
      is_taxable: taxable,
    };
    // Map the per-row variant state into the API shape (snake_case fields,
    // numeric stock). When editing, preserve the backend variant id encoded
    // in the local id (`v-<id>`) so the API updates rather than replaces the
    // row — keeps order history intact. New rows added in this session use
    // `v-<timestamp>-<i>` and get treated as creates.
    if (hasVariantsToggle && variants.length > 0) {
      payload.variants = variants.map((v) => {
        const backendIdMatch = /^v-(\d+)$/.exec(v.id);
        const row: NonNullable<ProductCreatePayload['variants']>[number] & { id?: number } = {
          options: v.options,
          price: v.price || payload.price,
          discount: v.discount || null,
          discount_type: v.discount ? v.discountType : null,
          cost_price: v.cost || null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || null,
          barcode: v.barcode || null,
          image: v.imageUrl || null,
        };
        if (backendIdMatch) row.id = Number(backendIdMatch[1]);
        return row;
      });
    }
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: (payload: ProductCreatePayload) => productsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      router.push('/dashboard/products');
    },
    onError: (err) => setSaveError(getApiErrorMessage(err, 'Failed to create product')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ProductUpdatePayload }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'product', editIdNum] });
      router.push('/dashboard/products');
    },
    onError: (err) => setSaveError(getApiErrorMessage(err, 'Failed to update product')),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  // `finalStatus` is omitted by the mid-wizard "Save Changes" button in edit
  // mode — we keep whatever status the product already has. Create flows and
  // the explicit Publish/Draft buttons on step 4 still pass it.
  const handleSave = (finalStatus?: 'active' | 'draft' | 'archived') => {
    setSaveError(null);
    if (!productName.trim()) {
      setSaveError('Product name is required');
      return;
    }
    if (!selectedCatId) {
      setSaveError('Please select a category');
      return;
    }
    const payload = buildPayload(finalStatus);
    if (isEditMode && editIdNum) {
      updateMutation.mutate({ id: editIdNum, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  /* ── Derived ─────────────────────────────────────────────────────── */
  const addCustomColor = (name: string, hex: string) => {
    setCustomColors(prev => ({ ...prev, [name]: hex }));
  };

  // Use API categories if loaded, otherwise fall back to local (so UI doesn't break during loading)
  const parentCats = apiCategories.length > 0
    ? apiCategories.filter(c => c.parent_id === null).map(c => ({ id: c.id, name: c.name, parentId: c.parent_id }))
    : PRODUCT_CATEGORIES.filter(c => c.parentId === null);
  const subCats = selectedCatId
    ? (apiCategories.length > 0
        ? apiCategories.filter(c => c.parent_id === selectedCatId).map(c => ({ id: c.id, name: c.name, parentId: c.parent_id }))
        : PRODUCT_CATEGORIES.filter(c => c.parentId === selectedCatId))
    : [];
  const hasVariants = options.length > 0 && options.some(o => o.values.length > 0);

  const recommendedOptions = useMemo(() => {
    if (selectedSubCatId && SHOE_SUBCATEGORY_IDS.includes(selectedSubCatId)) return SHOE_OPTIONS;
    if (selectedCatId && CATEGORY_OPTION_MAP[selectedCatId]) return CATEGORY_OPTION_MAP[selectedCatId];
    return ['Color', 'Size', 'Material'];
  }, [selectedCatId, selectedSubCatId]);

  const pendingSuggestions = useMemo(() => {
    const used = new Set(options.map(o => o.name));
    return recommendedOptions.filter(n => !used.has(n));
  }, [recommendedOptions, options]);

  const categoryLabel = useMemo(() => {
    const allCats = apiCategories.length > 0
      ? apiCategories.map(c => ({ id: c.id, name: c.name, parentId: c.parent_id }))
      : PRODUCT_CATEGORIES;
    const sub = selectedSubCatId ? allCats.find(c => c.id === selectedSubCatId) : null;
    const parent = selectedCatId ? allCats.find(c => c.id === selectedCatId) : null;
    if (sub && parent) return `${sub.name} in ${parent.name}`;
    if (parent) return parent.name;
    return null;
  }, [selectedCatId, selectedSubCatId, apiCategories]);

  const allFilterValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    options.forEach(o => { if (o.values.length) map[o.name] = o.values; });
    return map;
  }, [options]);

  /* ── Variant helpers ─────────────────────────────────────────────── */
  const regenerateVariants = (opts: VariantOption[]) => {
    const active = opts.filter(o => o.name.trim() && o.values.length > 0);
    if (active.length === 0) { setVariants([]); return; }
    const combos = cartesian(active.map(o => o.values));
    const newV: VariantRow[] = combos.map((combo, i) => {
      const optMap: Record<string, string> = {};
      active.forEach((o, j) => { optMap[o.name] = combo[j]; });
      const key = combo.join('/');
      const existing = variants.find(v => Object.values(v.options).join('/') === key);
      return {
        id: existing?.id ?? `v-${Date.now()}-${i}`,
        options: optMap,
        price: existing?.price ?? '',
        discount: existing?.discount ?? '',
        discountType: existing?.discountType ?? 'flat',
        cost: existing?.cost ?? '',
        stock: existing?.stock ?? '0',
        sku: existing?.sku ?? '',
        barcode: existing?.barcode ?? '',
        imageUrl: existing?.imageUrl ?? null,
      };
    });
    setVariants(newV);
    setSelectedIds(new Set());
  };

  const addOption = (name: string) => {
    const newOpt: VariantOption = { id: `${Date.now()}-${name}`, name, values: [] };
    const updated = [...options, newOpt];
    setOptions(updated);
    setShowAddOption(false);
    if (!groupBy && updated.length === 1) setGroupBy(name);
  };

  const addOptionWithValues = (name: string) => {
    const newOpt: VariantOption = { id: `${Date.now()}-${name}`, name, values: [] };
    const updated = [...options, newOpt];
    setOptions(updated);
    if (!groupBy && updated.length === 1) setGroupBy(name);
  };

  const acceptAllSuggestions = (names: string[]) => {
    const newOpts: VariantOption[] = names.map((name, i) => ({
      id: `${Date.now()}-${i}-${name}`,
      name,
      values: [],
    }));
    const updated = [...options, ...newOpts];
    setOptions(updated);
    if (!groupBy && options.length === 0 && newOpts.length > 0) setGroupBy(newOpts[0].name);
  };

  const updateOption = (id: string, opt: VariantOption) => {
    const updated = options.map(o => o.id === id ? opt : o);
    setOptions(updated);
    regenerateVariants(updated);
  };

  const removeOption = (id: string) => {
    const updated = options.filter(o => o.id !== id);
    setOptions(updated);
    regenerateVariants(updated);
    if (groupBy && !updated.find(o => o.name === groupBy)) setGroupBy(updated[0]?.name || null);
  };

  const toggleSelect = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelectedIds(new Set(variants.map(v => v.id)));
  const selectNone = () => setSelectedIds(new Set());
  const selectByValue = (val: string) => setSelectedIds(new Set(variants.filter(v => Object.values(v.options).includes(val)).map(v => v.id)));
  const applyBulk = (updates: { field: string; values: Record<string, string> }[]) => {
    setVariants(prev => prev.map(v => {
      let updated = { ...v };
      for (const { field, values } of updates) {
        if (values[v.id] !== undefined) {
          (updated as any)[field] = values[v.id];
        }
      }
      return updated;
    }));
  };
  const deleteSelected = () => { setVariants(p => p.filter(v => !selectedIds.has(v.id))); setSelectedIds(new Set()); };
  const updateVariant = (id: string, field: keyof VariantRow, value: string | null) => setVariants(p => p.map(v => v.id === id ? { ...v, [field]: value } : v));

  const grouped = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, VariantRow[]>();
    variants.forEach(v => {
      const key = v.options[groupBy] || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return map;
  }, [variants, groupBy]);

  const toggleGroup = (g: string) => setCollapsedGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const collapseAll = () => setCollapsedGroups(new Set(grouped ? [...grouped.keys()] : []));
  const expandAll = () => setCollapsedGroups(new Set());

  const tableOptionCols = options.filter(o => o.values.length > 0 && o.name !== groupBy);
  const isColor = (name: string) => name === 'Color';
  const getHex = (name: string) => resolveColorHex(name, customColors);

  /* ── Digital file upload ─────────────────────────────────────────── */
  const digitalFileRef = useRef<HTMLInputElement>(null);
  const handleDigitalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDigitalFileName(file.name);
    if (e.target) e.target.value = '';
  };

  /* ── Step navigation ─────────────────────────────────────────────── */
  const goToStep = (s: number) => {
    if (s < step || completedSteps.has(s) || s === step + 1) {
      if (s > step) setCompletedSteps(prev => new Set([...prev, step]));
      setStep(s);
    }
  };

  const nextStep = () => {
    if (step < 4) {
      setCompletedSteps(prev => new Set([...prev, step]));
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  /* ── Computed preview values ─────────────────────────────────────── */
  const finalPrice = useMemo(() => {
    const p = parseFloat(price) || 0;
    const d = parseFloat(comparePrice) || 0;
    if (p <= 0) return null;
    if (d <= 0) return p;
    return discountType === 'percent' ? p * (1 - d / 100) : p - d;
  }, [price, comparePrice, discountType]);

  const totalStock = useMemo(() => {
    if (hasVariantsToggle && variants.length > 0) {
      return variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
    }
    return parseInt(quantity) || 0;
  }, [hasVariantsToggle, variants, quantity]);

  /* ── Tags ────────────────────────────────────────────────────────── */
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  if (isEditMode && editLoading) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <PageHeader title="Edit Product" subtitle="Loading product..." />
        <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin mb-2" />
          <p className="text-sm">Loading product…</p>
        </div>
      </div>
    );
  }

  if (isEditMode && editError) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <PageHeader title="Edit Product" subtitle="Failed to load product" />
        <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-700">{getApiErrorMessage(editError, 'Failed to load product')}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push('/dashboard/products')}>
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to product list
      </Link>
      <PageHeader
        title={isEditMode ? 'Edit Product' : 'Add Product'}
        subtitle={isEditMode ? 'Update product details' : 'Create a new product listing'}
      />

      {/* ── Stepper Bar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const isCompleted = completedSteps.has(s.num);
            const isCurrent = step === s.num;
            const isFuture = s.num > step && !isCompleted;

            return (
              <div key={s.key} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(s.num)}
                  className={`flex items-center gap-2.5 ${
                    isCompleted || isCurrent ? 'cursor-pointer' : isFuture ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  disabled={isFuture && !completedSteps.has(s.num - 1) && s.num !== step + 1}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? <Check size={16} /> : s.num}
                  </div>
                  <span className={`text-sm font-medium hidden sm:inline ${
                    isCurrent ? 'text-gray-900' : isCompleted ? 'text-green-700' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 rounded-full ${
                    completedSteps.has(s.num) ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content: Left Form + Right Preview ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: form area (~60%) */}
        <div className="lg:col-span-3 flex flex-col gap-5">

          {/* ═══════════════════════════════════════════════════════════
             STEP 1: DESCRIBE
             ═══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-500 mb-5">
                  Start by telling us what you are selling. Add photos so customers know what they are getting.
                </p>

                {/* Product type toggle */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-2">Product Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button type="button" onClick={() => setProductType('physical')}
                      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        productType === 'physical'
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <Package size={20} className={productType === 'physical' ? 'text-gray-900' : 'text-gray-400'} />
                      <div className="text-left">
                        <span className={`text-sm font-semibold block ${productType === 'physical' ? 'text-gray-900' : 'text-gray-500'}`}>Physical</span>
                        <span className="text-[11px] text-gray-400">Ships to customers</span>
                      </div>
                    </button>
                    <button type="button" onClick={() => setProductType('digital')}
                      className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        productType === 'digital'
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <Monitor size={20} className={productType === 'digital' ? 'text-gray-900' : 'text-gray-400'} />
                      <div className="text-left">
                        <span className={`text-sm font-semibold block ${productType === 'digital' ? 'text-gray-900' : 'text-gray-500'}`}>Digital</span>
                        <span className="text-[11px] text-gray-400">Downloadable file or link</span>
                      </div>
                    </button>
                    {/* Bundle: routes to a separate dedicated wizard rather
                        than reusing this multi-step flow, since bundles
                        skip variants/inventory and need a component picker
                        + bundle-pricing strategy that don't apply here. */}
                    <Link
                      href="/dashboard/products/add/bundle"
                      className="flex items-start gap-3 px-4 py-3 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 transition-all"
                    >
                      <Package size={20} className="text-gray-400" />
                      <div className="text-left">
                        <span className="text-sm font-semibold block text-gray-500">Bundle</span>
                        <span className="text-[11px] text-gray-400">Combo of existing products</span>
                      </div>
                    </Link>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Choose the type of product you are adding</p>
                </div>

                {/* Product Name */}
                <div className="mb-5">
                  <Input label="Product Name" placeholder="e.g. Floral Kurti Set" value={productName}
                    onChange={e => setProductName(e.target.value)} />
                  <p className="text-[11px] text-gray-400 mt-1">Give your product a clear, descriptive name</p>
                </div>

                {/* Short Description */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-800">Short Description</label>
                    <span className={`text-[11px] ${shortDesc.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{shortDesc.length}/160</span>
                  </div>
                  <textarea value={shortDesc} onChange={e => { if (e.target.value.length <= 160) setShortDesc(e.target.value); }}
                    rows={2} placeholder="A brief summary shown below the product name on the storefront"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none resize-none placeholder:text-gray-400 transition-colors" />
                  <p className="text-[11px] text-gray-400 mt-1">Shown on the product page above the Add to Cart button</p>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Description</label>
                  <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your product in detail..." minHeight="160px" />
                  <p className="text-[11px] text-gray-400 mt-1">Full product details, features, specs — shown in the Description tab</p>
                </div>

                {/* Video URL — optional. Drives the storefront's "Watch Video"
                    button. Hidden entirely on the storefront when blank. */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Product Video <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Paste a YouTube link. Customers see a &ldquo;Watch Video&rdquo; button on the product page.
                    Accepts <code className="text-gray-500">youtube.com/watch?v=…</code>, <code className="text-gray-500">youtu.be/…</code>, or <code className="text-gray-500">/shorts/…</code>.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Size Guide Video <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="url"
                    value={sizeGuideUrl}
                    onChange={e => setSizeGuideUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Paste a YouTube link. Customers see a &ldquo;Size Guide&rdquo; link on the product page that opens the video.
                  </p>
                </div>

                {/* Custom Tabs */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-gray-800">Extra Tabs</label>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Add more tabs that will show up after the Description on the product page
                        (e.g. Shipping, Care Instructions, Size Guide).
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400">{customTabs.length}/10</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {customTabs.map((tab, idx) => (
                      <div key={tab.rowId} className="border border-gray-200 rounded-xl p-4 bg-gray-50/40">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500">Tab {idx + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCustomTabs((prev) => {
                                if (idx === 0) return prev;
                                const copy = [...prev];
                                [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                return copy;
                              })}
                              disabled={idx === 0}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomTabs((prev) => {
                                if (idx === prev.length - 1) return prev;
                                const copy = [...prev];
                                [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                                return copy;
                              })}
                              disabled={idx === customTabs.length - 1}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomTabs((prev) => prev.filter((t) => t.rowId !== tab.rowId))}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-600">Tab name (English)</label>
                              <span className={`text-[10px] ${tab.name_en.length > 30 ? 'text-red-500' : 'text-gray-400'}`}>
                                {tab.name_en.length}/30
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="Shipping"
                              value={tab.name_en}
                              onChange={(e) => {
                                if (e.target.value.length > 30) return;
                                setCustomTabs((prev) => prev.map((t) =>
                                  t.rowId === tab.rowId ? { ...t, name_en: e.target.value } : t,
                                ));
                              }}
                              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-gray-600">Tab name (বাংলা)</label>
                              <span className={`text-[10px] ${tab.name_bn.length > 30 ? 'text-red-500' : 'text-gray-400'}`}>
                                {tab.name_bn.length}/30
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="শিপিং"
                              value={tab.name_bn}
                              onChange={(e) => {
                                if (e.target.value.length > 30) return;
                                setCustomTabs((prev) => prev.map((t) =>
                                  t.rowId === tab.rowId ? { ...t, name_bn: e.target.value } : t,
                                ));
                              }}
                              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Content (English)</label>
                          <RichTextEditor
                            value={tab.content_en}
                            onChange={(v) => setCustomTabs((prev) => prev.map((t) =>
                              t.rowId === tab.rowId ? { ...t, content_en: v } : t,
                            ))}
                            placeholder="Tab content for English customers..."
                            minHeight="120px"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Content (বাংলা)</label>
                          <RichTextEditor
                            value={tab.content_bn}
                            onChange={(v) => setCustomTabs((prev) => prev.map((t) =>
                              t.rowId === tab.rowId ? { ...t, content_bn: v } : t,
                            ))}
                            placeholder="বাংলা গ্রাহকদের জন্য ট্যাব কন্টেন্ট..."
                            minHeight="120px"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            Leave blank to fall back to the English content for Bangla viewers.
                          </p>
                        </div>
                      </div>
                    ))}

                    {customTabs.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setCustomTabs((prev) => [...prev, {
                          rowId: newTabId(),
                          name_en: '', name_bn: '', content_en: '', content_bn: '',
                        }])}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2.5 transition-colors w-fit"
                      >
                        <Plus size={14} /> Add tab
                      </button>
                    )}
                  </div>
                </div>

                {/* Product Images */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Product Images</label>
                  <MultiImageUpload
                    values={productImages}
                    onChange={setProductImages}
                    maxFiles={8}
                    cropWidth={800}
                    cropHeight={800}
                    cropLabel="Crop Product Image"
                    placeholder="Drop product images here or click to browse"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Upload high-quality photos. The first image is the cover photo.</p>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Category</label>
                  <SearchableSelect
                    options={parentCats.map(c => ({ value: String(c.id), label: c.name }))}
                    value={selectedCatId ? String(selectedCatId) : null}
                    onChange={(v) => { setSelectedCatId(Number(v)); setSelectedSubCatId(null); }}
                    placeholder="Search category..."
                    searchPlaceholder="Search categories..."
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Helps customers find your product</p>
                </div>

                {/* Subcategory */}
                {subCats.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">Subcategory</label>
                    <SearchableSelect
                      options={subCats.map(c => ({ value: String(c.id), label: c.name }))}
                      value={selectedSubCatId ? String(selectedSubCatId) : null}
                      onChange={(v) => setSelectedSubCatId(Number(v))}
                      placeholder="Search subcategory..."
                      searchPlaceholder="Search subcategories..."
                    />
                    {categoryLabel && (
                      <p className="text-[11px] text-gray-400 mt-1">{categoryLabel}</p>
                    )}
                  </div>
                )}

                {/* Brand / Vendor (optional) -- only after category is selected */}
                {selectedCatId && <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Brand / Vendor <span className="text-gray-400 font-normal">(optional)</span></label>
                  <SearchableSelect
                    options={(() => {
                      const source = apiBrands.length > 0
                        ? apiBrands.map(b => ({ id: b.id, name: b.name, categoryId: b.category_id }))
                        : (selectedCatId ? PRODUCT_BRANDS.filter(b => b.categoryId === selectedCatId) : PRODUCT_BRANDS);
                      return [...source].sort((a, b) => a.name.localeCompare(b.name)).map(b => ({ value: String(b.id), label: b.name }));
                    })()}
                    value={selectedBrand}
                    onChange={(v) => setSelectedBrand(v)}
                    placeholder="Search or add brand"
                    searchPlaceholder="Search brands..."
                    creatable
                    onCreateLabel="Add as new brand"
                    onCreate={(name) => setSelectedBrand(name)}
                    hint={selectedCatId ? "Showing brands for selected category" : undefined}
                  />
                </div>}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             STEP 2: PRICE
             ═══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-500 mb-5">
                  How much will you charge? If your product comes in different sizes or colors, turn on variants.
                </p>

                {/* Has Variants toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl mb-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">This product has variants</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Enable if this product comes in different sizes, colors, or options</p>
                  </div>
                  <ToggleSwitch checked={hasVariantsToggle} onChange={setHasVariantsToggle} />
                </div>

                {/* No variants: show pricing */}
                {!hasVariantsToggle && (
                  <PricingSection
                    price={price} setPrice={setPrice}
                    comparePrice={comparePrice} setComparePrice={setComparePrice}
                    discountType={discountType} setDiscountType={setDiscountType}
                    costPrice={costPrice} setCostPrice={setCostPrice}
                    taxable={taxable} setTaxable={setTaxable}
                    unitAmount={unitAmount} setUnitAmount={setUnitAmount}
                    unitMeasure={unitMeasure} setUnitMeasure={setUnitMeasure}
                    baseMeasure={baseMeasure} setBaseMeasure={setBaseMeasure}
                    baseMeasureUnit={baseMeasureUnit} setBaseMeasureUnit={setBaseMeasureUnit}
                  />
                )}

                {/* Yes variants: show option builders + variant table */}
                {hasVariantsToggle && (
                  <div className="flex flex-col gap-4">
                    {/* Category suggestion banner -- above everything */}
                    {pendingSuggestions.length > 0 && selectedCatId && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-blue-800">{pendingSuggestions.length} suggestion{pendingSuggestions.length > 1 ? 's' : ''} available</p>
                          <button type="button"
                            onClick={() => acceptAllSuggestions(pendingSuggestions)}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors">
                            Accept all
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Category metafields{categoryLabel ? ` -- ${categoryLabel}` : ''}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {pendingSuggestions.map(name => (
                              <button key={name} type="button" onClick={() => addOptionWithValues(name)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors">
                                <Plus size={11} /> {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Option builders */}
                    {options.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {options.map(opt => (
                          <OptionBuilder key={opt.id} option={opt}
                            onUpdate={u => updateOption(opt.id, u)}
                            onRemove={() => removeOption(opt.id)}
                            recommended={recommendedOptions}
                            customColors={customColors}
                            onAddColor={addCustomColor} />
                        ))}
                      </div>
                    )}

                    {/* Add option button */}
                    {options.length < 3 && (
                      <div className="relative">
                        <button type="button" onClick={() => setShowAddOption(!showAddOption)}
                          className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors w-full">
                          <Plus size={14} /> Add options like size or color
                        </button>
                        {showAddOption && (
                          <AddOptionDropdown
                            recommended={recommendedOptions}
                            usedNames={options.map(o => o.name)}
                            onSelect={addOption}
                            onClose={() => setShowAddOption(false)}
                          />
                        )}
                      </div>
                    )}

                    {/* ── Variant Table ──────────────────────────────── */}
                    {variants.length > 0 && (
                      <div>
                        {/* Filter bar */}
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-3 text-xs">
                          <span className="text-gray-400 shrink-0">Select:</span>
                          <button type="button" onClick={selectAll} className="text-blue-600 hover:underline shrink-0">All</button>
                          <button type="button" onClick={selectNone} className="text-blue-600 hover:underline shrink-0">None</button>
                          {Object.entries(allFilterValues).map(([optName, vals]) =>
                            vals.map(val => (
                              <button key={`${optName}-${val}`} type="button" onClick={() => selectByValue(val)}
                                className="text-blue-600 hover:underline shrink-0">{val}</button>
                            ))
                          )}
                        </div>

                        {/* Bulk bar */}
                        {selectedIds.size > 0 && (
                          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center"><Check size={12} className="text-white" /></div>
                              <span className="text-xs font-semibold text-gray-700">{selectedIds.size} selected</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-2 md:flex-wrap md:ml-auto">
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={() => setBulkModal('price')}>Edit prices</Button>
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={() => setBulkModal('cost')}>Edit cost</Button>
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={() => setBulkModal('stock')}>Edit quantities</Button>
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={() => setBulkModal('sku')}>Edit SKU</Button>
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={() => {
                                const barcodes = generateVariantBarcodes(variants.length);
                                setVariants(prev => prev.map((v, i) => ({ ...v, barcode: barcodes[i] })));
                              }}>Gen All Barcodes</Button>
                              <Button variant="secondary" size="sm" className="w-full md:w-auto justify-center" onClick={deleteSelected}><Trash2 size={12} /> Delete</Button>
                            </div>
                          </div>
                        )}

                        {/* Group by selector */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500">Group by</span>
                          <SearchableSelect
                            options={[
                              { value: '', label: 'None (flat)' },
                              ...options.filter(o => o.values.length > 0).map(o => ({ value: o.name, label: o.name })),
                            ]}
                            value={groupBy || ''}
                            onChange={(v) => { setGroupBy(v || null); setCollapsedGroups(new Set()); }}
                            searchable={false}
                            size="sm"
                          />
                        </div>

                        {/* Variant table */}
                        <div className="border border-gray-200 rounded-xl overflow-visible">
                          {grouped ? (
                            <>
                              {/* Mobile-only: just select-all + collapse toggle (column labels live inside each card) */}
                              <div className="md:hidden flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" checked={selectedIds.size === variants.length && variants.length > 0}
                                    onChange={e => e.target.checked ? selectAll() : selectNone()} className="rounded" />
                                  <span>Select all</span>
                                </label>
                                <button type="button" onClick={() => collapsedGroups.size > 0 ? expandAll() : collapseAll()}
                                  className="text-blue-600 hover:underline font-medium">
                                  {collapsedGroups.size > 0 ? 'Expand all' : 'Collapse all'}
                                </button>
                              </div>

                              {/* Desktop header — hidden on mobile */}
                              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                                <div className="w-7">
                                  <input type="checkbox" checked={selectedIds.size === variants.length && variants.length > 0}
                                    onChange={e => e.target.checked ? selectAll() : selectNone()} className="rounded" />
                                </div>
                                <div className="flex items-center gap-1 flex-1">
                                  <span>Variant</span>
                                  <span className="mx-1">--</span>
                                  <button type="button" onClick={() => collapsedGroups.size > 0 ? expandAll() : collapseAll()}
                                    className="text-blue-600 hover:underline font-medium">
                                    {collapsedGroups.size > 0 ? 'Expand all' : 'Collapse all'}
                                  </button>
                                </div>
                                <span className="w-24 text-left">Price</span>
                                <span className="w-20 text-left">Stock</span>
                                <span className="w-24 text-left">SKU</span>
                                <span className="w-32 text-left">Barcode</span>
                                <span className="w-12"></span>
                              </div>

                              <div className="divide-y-4 divide-[#2596be]/30 md:divide-y md:divide-gray-100">
                                {[...grouped.entries()].map(([groupKey, rows]) => {
                                  const isCollapsed = collapsedGroups.has(groupKey);
                                  const groupColorHex = isColor(groupBy!) ? getHex(groupKey) : null;
                                  return (
                                    <div key={groupKey}>
                                      <button type="button" onClick={() => toggleGroup(groupKey)}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                                        <div className="w-7">
                                          <input type="checkbox"
                                            checked={rows.every(r => selectedIds.has(r.id))}
                                            onChange={e => {
                                              const ids = rows.map(r => r.id);
                                              setSelectedIds(p => {
                                                const n = new Set(p);
                                                if (e.target.checked) ids.forEach(id => n.add(id)); else ids.forEach(id => n.delete(id));
                                                return n;
                                              });
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            className="rounded"
                                          />
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                          <ImageUpload
                                            value={rows[0].imageUrl || undefined}
                                            onChange={url => rows.forEach(r => { if (!r.imageUrl) updateVariant(r.id, 'imageUrl', url); })}
                                            variant="square"
                                            cropWidth={800}
                                            cropHeight={800}
                                            cropLabel="Crop Variant Image"
                                            className="w-8 h-8"
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          {groupColorHex && <ColorSwatch hex={groupColorHex} size={14} />}
                                          <div>
                                            <p className="text-xs font-semibold text-gray-900">{groupKey}</p>
                                            <p className="text-[11px] text-gray-500">{rows.length} variant{rows.length !== 1 ? 's' : ''}</p>
                                          </div>
                                          {isCollapsed ? <ChevronRight size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                        </div>
                                      </button>
                                      {!isCollapsed && rows.map(row => (
                                        <div key={row.id} className="flex flex-col md:flex-row md:items-center gap-2 px-3 py-2 pl-3 md:pl-10 bg-white hover:bg-gray-50/50 border-t-2 border-gray-200 md:border-t md:border-gray-50">
                                          {/* Identity: checkbox + image + option labels (Edit goes here on mobile) */}
                                          <div className="flex items-center gap-2 md:flex-shrink-0">
                                            <div className="w-7">
                                              <input type="checkbox" checked={selectedIds.has(row.id)}
                                                onChange={() => toggleSelect(row.id)} className="rounded" />
                                            </div>
                                            <ImageUpload
                                              value={row.imageUrl || rows[0].imageUrl || undefined}
                                              onChange={url => updateVariant(row.id, 'imageUrl', url)}
                                              variant="square"
                                              cropWidth={800}
                                              cropHeight={800}
                                              cropLabel="Crop Variant Image"
                                              className="w-8 h-8"
                                            />
                                            <div className="flex-1 min-w-0 flex items-center gap-3">
                                              {tableOptionCols.map(o => (
                                                <span key={o.id} className="text-xs text-gray-700 flex items-center gap-1">
                                                  {isColor(o.name) && getHex(row.options[o.name]) && <ColorSwatch hex={getHex(row.options[o.name])!} size={10} />}
                                                  {row.options[o.name] || '-'}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Inputs: 2-col grid on mobile, inline row on desktop */}
                                          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-2 md:flex-1">
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">Price</span>
                                              <input type="number" min="0" step="0.01" placeholder="Price"
                                                value={row.price} onChange={e => updateVariant(row.id, 'price', e.target.value)}
                                                className="w-full md:w-20 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                            </label>
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">Discount</span>
                                              <div className="flex gap-0">
                                                <input type="number" min="0" step="0.01" placeholder="Disc."
                                                  value={row.discount} onChange={e => updateVariant(row.id, 'discount', e.target.value)}
                                                  className="flex-1 md:w-16 min-w-0 h-8 px-2 border border-gray-200 rounded-l-md text-xs focus:border-gray-400 outline-none" />
                                                <button type="button" onClick={() => updateVariant(row.id, 'discountType', row.discountType === 'flat' ? 'percent' : 'flat')}
                                                  className="h-8 px-1.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-md text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors shrink-0">
                                                  {row.discountType === 'flat' ? '\u09F3' : '%'}
                                                </button>
                                              </div>
                                            </label>
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">Cost</span>
                                              <input type="number" min="0" step="0.01" placeholder="Cost"
                                                value={row.cost} onChange={e => updateVariant(row.id, 'cost', e.target.value)}
                                                className="w-full md:w-18 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                            </label>
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">Stock</span>
                                              <input type="number" min="0" placeholder="Stock"
                                                value={row.stock} onChange={e => updateVariant(row.id, 'stock', e.target.value)}
                                                className="w-full md:w-16 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                            </label>
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">SKU</span>
                                              <input type="text" placeholder="SKU" value={row.sku}
                                                onChange={e => updateVariant(row.id, 'sku', e.target.value)}
                                                className="w-full md:w-20 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                            </label>
                                            <label className="block w-full md:w-auto">
                                              <span className="text-[10px] text-gray-500 mb-0.5 block md:hidden">Barcode</span>
                                              <div className="flex gap-1">
                                                <input type="text" placeholder="Barcode" value={row.barcode}
                                                  onChange={e => updateVariant(row.id, 'barcode', e.target.value)}
                                                  className="flex-1 md:w-24 min-w-0 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                                <button type="button" onClick={() => updateVariant(row.id, 'barcode', generateEan13())}
                                                  className="h-8 px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md text-[11px] font-medium text-gray-600 transition-colors shrink-0">
                                                  Gen
                                                </button>
                                              </div>
                                            </label>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="overflow-x-auto -mx-4 px-4 md:-mx-0 md:px-0">
                            <table className="w-full text-xs" style={{ minWidth: 850 }}>
                              <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                  <th className="w-8 px-3 py-2.5">
                                    <input type="checkbox" checked={selectedIds.size === variants.length && variants.length > 0}
                                      onChange={e => e.target.checked ? selectAll() : selectNone()} className="rounded" />
                                  </th>
                                  <th className="w-10 px-2 py-2.5"></th>
                                  {options.filter(o => o.values.length > 0).map(o => (
                                    <th key={o.id} className="text-left px-3 py-2.5 font-medium text-gray-500">{o.name}</th>
                                  ))}
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Price</th>
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Discount</th>
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Cost</th>
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Stock</th>
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">SKU</th>
                                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Barcode</th>
                                  <th className="px-3 py-2.5"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {variants.map(row => (
                                  <tr key={row.id} className="hover:bg-gray-50/50">
                                    <td className="px-3 py-2">
                                      <input type="checkbox" checked={selectedIds.has(row.id)}
                                        onChange={() => toggleSelect(row.id)} className="rounded" />
                                    </td>
                                    <td className="px-2 py-2">
                                      <ImageUpload
                                        value={row.imageUrl || undefined}
                                        onChange={url => updateVariant(row.id, 'imageUrl', url)}
                                        variant="square"
                                        cropWidth={800}
                                        cropHeight={800}
                                        cropLabel="Crop Variant Image"
                                        className="w-8 h-8"
                                      />
                                    </td>
                                    {options.filter(o => o.values.length > 0).map(o => (
                                      <td key={o.id} className="px-3 py-2">
                                        <span className="text-gray-700 flex items-center gap-1">
                                          {isColor(o.name) && getHex(row.options[o.name]) && <ColorSwatch hex={getHex(row.options[o.name])!} size={10} />}
                                          {row.options[o.name] || '-'}
                                        </span>
                                      </td>
                                    ))}
                                    <td className="px-3 py-2">
                                      <input type="number" min="0" step="0.01" placeholder="Price"
                                        value={row.price} onChange={e => updateVariant(row.id, 'price', e.target.value)}
                                        className="w-20 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-0">
                                        <input type="number" min="0" step="0.01" placeholder="Disc."
                                          value={row.discount} onChange={e => updateVariant(row.id, 'discount', e.target.value)}
                                          className="w-16 h-8 px-2 border border-gray-200 rounded-l-md text-xs focus:border-gray-400 outline-none" />
                                        <button type="button" onClick={() => updateVariant(row.id, 'discountType', row.discountType === 'flat' ? 'percent' : 'flat')}
                                          className="h-8 px-1.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r-md text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                                          {row.discountType === 'flat' ? '\u09F3' : '%'}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="number" min="0" step="0.01" placeholder="Cost"
                                        value={row.cost} onChange={e => updateVariant(row.id, 'cost', e.target.value)}
                                        className="w-18 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="number" min="0" placeholder="Stock"
                                        value={row.stock} onChange={e => updateVariant(row.id, 'stock', e.target.value)}
                                        className="w-16 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input type="text" placeholder="SKU" value={row.sku}
                                        onChange={e => updateVariant(row.id, 'sku', e.target.value)}
                                        className="w-20 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <input type="text" placeholder="Barcode" value={row.barcode}
                                          onChange={e => updateVariant(row.id, 'barcode', e.target.value)}
                                          className="w-24 h-8 px-2 border border-gray-200 rounded-md text-xs focus:border-gray-400 outline-none" />
                                        <button type="button" onClick={() => updateVariant(row.id, 'barcode', generateEan13())}
                                          className="h-8 px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md text-[11px] font-medium text-gray-600 transition-colors shrink-0">
                                          Gen
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <button type="button"
                                        className="h-8 px-2.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-500">{variants.length} variant{variants.length !== 1 ? 's' : ''} total</p>
                            <p className="text-xs font-medium text-gray-700">
                              Total stock: {variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             STEP 3: STOCK & DELIVERY
             ═══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-500 mb-5">
                  How many do you have in stock? We will track inventory so you never oversell.
                </p>

                {/* Physical product inventory -- no variants */}
                {productType === 'physical' && !hasVariantsToggle && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input label="SKU" placeholder="e.g. KRT-001" value={sku} onChange={e => setSku(e.target.value)} />
                        <p className="text-[11px] text-gray-400 mt-1">A unique code to identify this product in your inventory</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">Barcode</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="EAN-13 / UPC" value={barcode}
                            onChange={e => setBarcode(e.target.value)}
                            className="flex-1 h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors" />
                          <button type="button" onClick={() => setBarcode(generateEan13())}
                            className="h-10 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors shrink-0">
                            Generate
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Click Generate for a valid Bangladesh EAN-13 barcode</p>
                      </div>
                    </div>

                    <div>
                      <Input label="Quantity" placeholder="0" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
                      <p className="text-[11px] text-gray-400 mt-1">How many units do you currently have in stock?</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="track" className="rounded" checked={trackInventory} onChange={e => setTrackInventory(e.target.checked)} />
                      <label htmlFor="track" className="text-sm text-gray-700">Track inventory</label>
                    </div>
                    <p className="text-[11px] text-gray-400 -mt-2">Keep this on to automatically reduce stock when an order is placed</p>
                  </div>
                )}

                {/* Physical product -- with variants summary */}
                {productType === 'physical' && hasVariantsToggle && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center">
                        <Check size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{variants.length} variant{variants.length !== 1 ? 's' : ''} configured</p>
                        <p className="text-[11px] text-gray-500">Total stock across all variants: {variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)} units</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">Stock for each variant was set in the Price step. Go back to adjust individual variant quantities.</p>
                  </div>
                )}

                {/* Digital product delivery */}
                {productType === 'digital' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-2">Delivery Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setDigitalDelivery('upload')}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                            digitalDelivery === 'upload'
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <FileDown size={18} className={digitalDelivery === 'upload' ? 'text-gray-900' : 'text-gray-400'} />
                          <div className="text-left">
                            <span className={`text-sm font-semibold block ${digitalDelivery === 'upload' ? 'text-gray-900' : 'text-gray-500'}`}>File Upload</span>
                            <span className="text-[11px] text-gray-400">Host the file with us</span>
                          </div>
                        </button>
                        <button type="button" onClick={() => setDigitalDelivery('link')}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                            digitalDelivery === 'link'
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <Link2 size={18} className={digitalDelivery === 'link' ? 'text-gray-900' : 'text-gray-400'} />
                          <div className="text-left">
                            <span className={`text-sm font-semibold block ${digitalDelivery === 'link' ? 'text-gray-900' : 'text-gray-500'}`}>External Link</span>
                            <span className="text-[11px] text-gray-400">Google Drive, Dropbox, etc.</span>
                          </div>
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">How will customers receive this digital product?</p>
                    </div>

                    {/* File upload area */}
                    {digitalDelivery === 'upload' && (
                      <div>
                        {digitalFileName ? (
                          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <FileDown size={18} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{digitalFileName}</p>
                                <p className="text-[11px] text-gray-400">Uploaded successfully</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => setDigitalFileName('')}
                              className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg py-4 px-4 flex items-center gap-4 hover:border-gray-400 transition-colors cursor-pointer"
                            onClick={() => digitalFileRef.current?.click()}>
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Upload size={18} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">Upload digital file</p>
                              <p className="text-[11px] text-gray-400">PDF, ZIP, MP3, MP4, EPUB up to 100MB</p>
                            </div>
                            <Button variant="secondary" size="sm">Choose File</Button>
                          </div>
                        )}
                        <input ref={digitalFileRef} type="file" className="hidden" onChange={handleDigitalFile} />
                        <p className="text-[11px] text-gray-400 mt-1">The file customers will download after purchase</p>
                      </div>
                    )}

                    {/* External link input */}
                    {digitalDelivery === 'link' && (
                      <div>
                        <Input
                          label="Download URL"
                          placeholder="https://drive.google.com/file/..."
                          value={digitalExternalUrl}
                          onChange={e => setDigitalExternalUrl(e.target.value)}
                          hint="Google Drive, Dropbox, or any direct download link"
                          leftIcon={<Link2 size={16} />}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Customers will be redirected to this link after purchase</p>
                      </div>
                    )}

                    {/* Download limits */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Download Limit"
                          type="number"
                          min={0}
                          value={downloadLimit}
                          onChange={e => setDownloadLimit(e.target.value)}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Max downloads per customer (0 = unlimited)</p>
                      </div>
                      <div>
                        <Input
                          label="Expiry (days)"
                          type="number"
                          min={0}
                          value={downloadExpiry}
                          onChange={e => setDownloadExpiry(e.target.value)}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Days until the download link expires</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             STEP 4: REVIEW & PUBLISH
             ═══════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-500 mb-5">
                  Almost done! Review everything and choose when to make it live.
                </p>

                {/* Status */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Status</label>
                  <SearchableSelect
                    options={[
                      { value: 'active', label: 'Active (Published)' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                    value={status}
                    onChange={(v) => setStatus(v)}
                    searchable={false}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Draft products are hidden from your store. Publish when ready.</p>
                </div>

                {/* Tags */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Tags <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[42px]">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">
                        {t} <button type="button" onClick={() => removeTag(t)}><X size={9} className="cursor-pointer hover:text-red-500" /></button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder={tags.length === 0 ? "Type a tag and press Enter" : "Add more..."}
                      className="flex-1 min-w-[120px] text-xs outline-none py-0.5 bg-transparent placeholder:text-gray-400"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Tags help customers find your product. Press Enter to add each tag.</p>
                </div>

                {/* SEO section */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">SEO <span className="text-gray-400 font-normal text-xs">(optional)</span></h3>
                    <button type="button" onClick={() => setSeoOpen(!seoOpen)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                      {seoOpen ? 'Close' : 'Edit'} <ChevronDown size={12} className={`transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Google preview — uses the real store domain + the most
                      specific URL we have (custom handle → saved slug →
                      auto-slug from product name → placeholder). */}
                  {(() => {
                    const autoSlug = productName
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    const handle = seoHandle || editProductData?.slug || autoSlug || 'your-product-url';
                    return (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-green-700 font-medium truncate">
                          {seoDomain}/products/{handle}
                        </p>
                        <p className="text-sm text-blue-800 font-medium mt-1 hover:underline cursor-pointer">
                          {seoTitle || productName || 'Product Title'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {seoDesc
                            || shortDesc
                            || (description ? description.replace(/<[^>]+>/g, '').slice(0, 160) : '')
                            || 'Add a meta description to see how this product appears in search engine results.'}
                        </p>
                      </div>
                    );
                  })()}

                  {seoOpen && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">Page Title</label>
                          <span className={`text-[11px] ${seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>{seoTitle.length}/60</span>
                        </div>
                        <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
                          placeholder="e.g. Floral Kurti Set - Summer Collection"
                          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
                        <p className="text-[11px] text-gray-400 mt-1">Appears as the clickable title in search results. Keep it under 60 characters.</p>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs font-medium text-gray-700">Meta Description</label>
                          <span className={`text-[11px] ${seoDesc.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{seoDesc.length}/160</span>
                        </div>
                        <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} rows={3}
                          placeholder="Briefly describe your product for search engines..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none" />
                        <p className="text-[11px] text-gray-400 mt-1">Shown as the snippet text below the title in Google. Keep it under 160 characters.</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">URL Handle</label>
                        <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                          <span className="text-[11px] text-gray-400 px-2 bg-gray-50 h-9 flex items-center whitespace-nowrap border-r border-gray-200">/products/</span>
                          <input type="text" value={seoHandle} onChange={e => setSeoHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="floral-kurti-set"
                            className="flex-1 h-9 px-2 text-sm outline-none" />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Auto-generated from product name, but you can customize it</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

          {/* ── Navigation buttons ───────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <div>
              {step > 1 && (
                <Button variant="secondary" size="sm" onClick={prevStep}>
                  <ChevronLeft size={14} /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {saveError && (
                <span className="text-xs text-red-600 flex items-center gap-1 mr-2">
                  <AlertCircle size={12} /> {saveError}
                </span>
              )}
              {/* Edit mode: show Save Changes on every step so the vendor can
                  jump-and-save without walking through the whole wizard. The
                  Next Step button stays available for guided flow. */}
              {isEditMode && step !== 4 && (
                <Button size="sm" onClick={() => handleSave()} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Changes
                </Button>
              )}

              {step === 4 ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Save as Draft
                  </Button>
                  <Button size="sm" onClick={() => handleSave('active')} disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {isEditMode ? 'Update Product' : 'Publish Product'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant={isEditMode ? 'secondary' : 'primary'}
                  onClick={nextStep}
                >
                  Next Step <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview (~40%) */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="bg-white border border-gray-200 rounded-xl">
              {/* Preview header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <Eye size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</span>
              </div>

              {/* Mini product detail page layout */}
              <div className="p-4">
                {/* Image gallery */}
                <div className="mb-3">
                  <div className="h-36 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {productImages.length > 0 ? (
                      <img src={productImages[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Image size={24} className="text-gray-300" />
                        <p className="text-[11px] text-gray-400">No image yet</p>
                      </div>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {productImages.length > 1 && (
                    <div className="flex gap-1.5 mt-1.5 overflow-visible">
                      {productImages.map((img, i) => (
                        <div key={i} className={`w-10 h-10 rounded border shrink-0 overflow-hidden ${i === 0 ? 'border-gray-900' : 'border-gray-200'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status + type badges */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                    status === 'active' ? 'bg-green-100 text-green-700' :
                    status === 'archived' ? 'bg-gray-100 text-gray-500' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {status === 'active' ? 'Published' : status === 'archived' ? 'Archived' : 'Draft'}
                  </span>
                  {categoryLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{categoryLabel}</span>
                  )}
                </div>

                {/* Product name */}
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {productName || 'Product Name'}
                </h3>

                {/* Short description */}
                {shortDesc && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words overflow-hidden">{shortDesc}</p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-2.5">
                  {!hasVariantsToggle ? (
                    <>
                      {finalPrice !== null && finalPrice !== (parseFloat(price) || 0) ? (
                        <>
                          <span className="text-lg font-bold text-gray-900">{'\u09F3'}{finalPrice.toFixed(2)}</span>
                          <span className="text-sm text-gray-400 line-through">{'\u09F3'}{parseFloat(price).toFixed(2)}</span>
                        </>
                      ) : price ? (
                        <span className="text-lg font-bold text-gray-900">{'\u09F3'}{parseFloat(price).toFixed(2)}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-300">{'\u09F3'}0.00</span>
                      )}
                    </>
                  ) : (
                    variants.length > 0 ? (
                      <span className="text-sm text-gray-500">From {'\u09F3'}{Math.min(...variants.map(v => parseFloat(v.price) || 0)).toFixed(2)}</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-300">{'\u09F3'}0.00</span>
                    )
                  )}
                </div>

                {/* Variant options preview with stock */}
                {hasVariantsToggle && options.some(o => o.values.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {options.filter(o => o.values.length > 0).map(o => {
                      // Calculate stock per option value
                      const stockByValue: Record<string, number> = {};
                      o.values.forEach(val => {
                        stockByValue[val] = variants
                          .filter(v => v.options[o.name] === val)
                          .reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
                      });
                      return (
                        <div key={o.id} className="mb-2 last:mb-0">
                          <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">{o.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {o.values.slice(0, 6).map(v => (
                              <span key={v} className="text-[10px] px-2 py-0.5 border border-gray-200 rounded text-gray-600">
                                {v}{stockByValue[v] > 0 ? ` (${stockByValue[v]})` : ''}
                              </span>
                            ))}
                            {o.values.length > 6 && (
                              <span className="text-[10px] px-2 py-0.5 text-gray-400">+{o.values.length - 6} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {productType === 'physical' ? (
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-[11px] text-white font-medium">Add to Cart</span>
                      </div>
                      <div className="flex-1 h-8 border border-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-[11px] text-gray-900 font-medium">Buy Now</span>
                      </div>
                      <div className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-[11px] text-white font-medium">Buy Now</span>
                      </div>
                      <div className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {productType === 'physical' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {totalStock} in stock
                    </span>
                  )}
                  {productType === 'digital' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                      Digital download
                    </span>
                  )}
                  {hasVariantsToggle && variants.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {selectedBrand && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {(() => {
                        const apiBrand = apiBrands.find(b => String(b.id) === selectedBrand);
                        if (apiBrand) return apiBrand.name;
                        const brand = PRODUCT_BRANDS.find(b => String(b.id) === selectedBrand);
                        return brand ? brand.name : selectedBrand;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick step checklist */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Checklist</h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Product name', done: !!productName },
                  { label: 'Short description', done: !!shortDesc },
                  { label: 'Product image', done: productImages.length > 0 },
                  { label: 'Category selected', done: !!selectedCatId },
                  { label: 'Price set', done: hasVariantsToggle ? variants.some(v => !!v.price) : !!price },
                  { label: productType === 'digital' ? 'File or link added' : 'Stock quantity', done: productType === 'digital' ? !!(digitalFileName || digitalExternalUrl) : (hasVariantsToggle ? variants.some(v => parseInt(v.stock) > 0) : !!quantity) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      item.done ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      {item.done && <Check size={10} className="text-white" />}
                    </div>
                    <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk modals */}
      {bulkModal === 'price' && <BulkEditModal title="Edit prices & discounts" field="price" variants={variants} selected={selectedIds} onApply={applyBulk} onClose={() => setBulkModal(null)} />}
      {bulkModal === 'cost' && <BulkEditModal title="Edit cost per item" field="cost" variants={variants} selected={selectedIds} onApply={applyBulk} onClose={() => setBulkModal(null)} />}
      {bulkModal === 'stock' && <BulkEditModal title="Edit quantities" field="stock" variants={variants} selected={selectedIds} onApply={applyBulk} onClose={() => setBulkModal(null)} />}
      {bulkModal === 'sku' && <BulkEditModal title="Edit SKU" field="sku" variants={variants} selected={selectedIds} onApply={applyBulk} onClose={() => setBulkModal(null)} />}
    </div>
  );
}

export default function AddProductWizard() {
  return (
    <Suspense fallback={
      <div className="max-w-[1200px] mx-auto">
        <PageHeader title="Add Product" subtitle="Loading..." />
        <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin mb-2" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    }>
      <AddProductWizardInner />
    </Suspense>
  );
}
