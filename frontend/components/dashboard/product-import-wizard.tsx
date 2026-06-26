"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload, Download, X, Check, AlertTriangle, FileSpreadsheet,
  Trash2, RefreshCw, Search, ChevronDown, ChevronRight, Package, Layers,
} from "lucide-react";
import { PRODUCT_CATEGORIES, PRODUCT_BRANDS } from "@/lib/product-data";
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';

/* ── CSV Template Definition ───────────────────────────────────────── */
const CSV_COLUMNS = [
  { key: 'name', label: 'Product Name', required: true, example: 'Floral Kurti Set', desc: 'The name customers will see in your store', scope: 'all' as const },
  { key: 'category', label: 'Category', required: false, example: "Women's Fashion", desc: 'Parent category name or ID from your store', scope: 'all' as const },
  { key: 'subcategory', label: 'Subcategory', required: false, example: 'Salwar Kameez', desc: 'Subcategory name or ID (must belong to the category above)', scope: 'all' as const },
  { key: 'brand', label: 'Brand', required: false, example: 'Aarong', desc: 'Brand name or ID. Leave empty if not applicable', scope: 'all' as const },
  { key: 'sku', label: 'SKU', required: false, example: 'KRT-001', desc: 'Stock Keeping Unit -- your internal product code', scope: 'all' as const },
  { key: 'barcode', label: 'Barcode', required: false, example: '8800001000013', desc: 'EAN-13 barcode. Leave empty to auto-generate after import', scope: 'all' as const },
  { key: 'price', label: 'Price', required: true, example: '500', desc: 'Selling price in BDT. For variant products, this is the default price', scope: 'all' as const },
  { key: 'discount', label: 'Discount', required: false, example: '50', desc: 'Discount amount (flat) or percentage depending on Discount Type', scope: 'all' as const },
  { key: 'discount_type', label: 'Discount Type', required: false, example: 'flat or percent', desc: '"flat" for fixed amount off, "percent" for percentage off', scope: 'all' as const },
  { key: 'cost', label: 'Cost Price', required: false, example: '300', desc: 'Your cost to source this product. Used to calculate profit margin', scope: 'all' as const },
  { key: 'stock', label: 'Stock', required: true, example: '20', desc: 'How many units you have. For digital products, use 1 (unlimited) or set a limit', scope: 'all' as const },
  { key: 'short_description', label: 'Short Description', required: false, example: 'Beautiful floral print kurti', desc: 'Brief summary shown below the product name (max 200 chars)', scope: 'all' as const },
  { key: 'description', label: 'Description', required: false, example: 'Full product details...', desc: 'Detailed product description shown on the product page', scope: 'all' as const },
  { key: 'tags', label: 'Tags', required: false, example: 'kurti, summer, floral', desc: 'Comma-separated tags for search and filtering', scope: 'all' as const },
  { key: 'image_urls', label: 'Image URLs', required: false, example: 'https://example.com/img1.jpg', desc: 'Comma-separated image URLs. First image becomes the cover photo. You can also add images after import', scope: 'all' as const },
  { key: 'has_variants', label: 'Has Variants', required: false, example: 'yes or no', desc: '"yes" if the product has size/color options, "no" for single products', scope: 'variant' as const },
  { key: 'variant_options', label: 'Variant Options', required: false, example: 'Color:Red;Blue|Size:S;M;L', desc: 'Format: OptionName:Value1;Value2|OptionName2:Value1;Value2. Pipe separates option types, semicolon separates values', scope: 'variant' as const },
  { key: 'variant_prices', label: 'Variant Prices', required: false, example: '500;550;500;550;500;550', desc: 'Price per variant combination, semicolon-separated. Must match the number of combinations', scope: 'variant' as const },
  { key: 'variant_discounts', label: 'Variant Discounts', required: false, example: '50;50;50;50;50;50', desc: 'Discount per variant, semicolon-separated. Same order as variant prices', scope: 'variant' as const },
  { key: 'variant_stocks', label: 'Variant Stocks', required: false, example: '10;10;5;5;8;8', desc: 'Stock quantity per variant, semicolon-separated', scope: 'variant' as const },
  { key: 'variant_skus', label: 'Variant SKUs', required: false, example: 'KRT-R-S;KRT-B-S;...', desc: 'SKU per variant. Leave empty to not assign SKUs to variants', scope: 'variant' as const },
  { key: 'variant_barcodes', label: 'Variant Barcodes', required: false, example: '', desc: 'Barcode per variant. Leave empty to auto-generate after import', scope: 'variant' as const },
  { key: 'digital_url', label: 'Digital File URL', required: false, example: 'https://drive.google.com/file/...', desc: 'Download link for digital product. Can also upload files after import', scope: 'digital' as const },
  { key: 'download_limit', label: 'Download Limit', required: false, example: '3', desc: 'Max number of times buyer can download. Leave empty for unlimited', scope: 'digital' as const },
];

/* ── Template types ───────────────────────────────────────────────── */
type TemplateType = 'physical' | 'physical-variant' | 'digital' | 'digital-variant';

const TEMPLATE_TYPES: { key: TemplateType; label: string; desc: string; icon: string }[] = [
  { key: 'physical', label: 'Physical Product', desc: 'Simple product without size/color options', icon: 'box' },
  { key: 'physical-variant', label: 'Physical + Variants', desc: 'Product with size, color, or other options', icon: 'boxes' },
  { key: 'digital', label: 'Digital Product', desc: 'Downloadable file or link, no variants', icon: 'file' },
  { key: 'digital-variant', label: 'Digital + Variants', desc: 'Digital product with license tiers, formats, etc.', icon: 'files' },
];

function getColumnsForTemplate(type: TemplateType) {
  return CSV_COLUMNS.filter(col => {
    if (col.scope === 'all') return true;
    if (col.scope === 'variant') return type.includes('variant');
    if (col.scope === 'digital') return type.includes('digital');
    return true;
  });
}

function generateTemplateForType(type: TemplateType): string {
  const cols = getColumnsForTemplate(type);
  const headers = cols.map(c => quoteCSV(c.label)).join(',');

  const examples: Record<TemplateType, string[][]> = {
    'physical': [[
      'Muslin Saree Red', "Women's Fashion", 'Sarees', 'Aarong',
      'SAR-001', '', '2500', '200', 'flat', '1500', '25',
      'Beautiful handwoven muslin saree', 'Premium quality muslin saree with traditional border design.', 'saree, muslin, red', '',
    ], [
      'Organic Honey 500g', 'Groceries & Pets', 'Organic Food', 'PRAN',
      'HON-001', '', '450', '', '', '250', '50',
      'Pure organic honey', 'Collected from Sundarbans. 100% natural, no preservatives.', 'honey, organic, food', '',
    ]],
    'physical-variant': [[
      'Cotton Panjabi', "Men's Fashion", 'Panjabi & Fatua', 'Yellow',
      'PAN-001', '', '800', '10', 'percent', '400', '0',
      'Premium cotton panjabi', 'Comfortable cotton panjabi for all occasions.', 'panjabi, cotton, men', '',
      'yes', 'Color:White;Off-White;Sky Blue|Size:M;L;XL',
      '800;800;850;800;800;850;800;800;850', '', '10;10;8;10;10;8;10;10;8', '', '',
    ], [
      'Printed T-Shirt', "Men's Fashion", 'T-Shirts & Polos', '',
      'TSH-001', '', '400', '50', 'flat', '200', '0',
      'Casual printed t-shirt', 'Soft cotton blend, machine washable.', 't-shirt, casual, men', '',
      'yes', 'Size:S;M;L;XL', '400;400;400;450', '50;50;50;50', '15;20;20;10', '', '',
    ]],
    'digital': [[
      'Bangla Typography Course', 'Digital Goods', 'Digital Learning', '',
      'DIG-001', '', '1200', '', '', '800', '1',
      'Learn Bangla typography from scratch', 'Complete video course covering Bangla type design.', 'course, typography, digital', '',
      'https://drive.google.com/file/d/abc123', '3',
    ], [
      'Recipe eBook', 'Digital Goods', 'Digital Learning', '',
      'DIG-002', '', '200', '20', 'percent', '', '1',
      'Traditional Bengali recipes', '50+ recipes with step-by-step instructions.', 'ebook, recipe, bengali', '',
      '', '',
    ]],
    'digital-variant': [[
      'UI Kit Bundle', 'Digital Goods', 'Software & Licenses', '',
      'UIK-001', '', '2000', '500', 'flat', '', '0',
      'Professional UI kit', 'Includes 200+ components. Lifetime updates.', 'ui kit, figma, design', '',
      'yes', 'License:Personal;Commercial|Format:Figma;Sketch',
      '1500;2500;1500;2500', '500;500;500;500', '1;1;1;1', 'UIK-P-F;UIK-C-F;UIK-P-S;UIK-C-S', '',
      '', '',
    ]],
  };

  const exampleRows = examples[type].map(vals => vals.map(quoteCSV).join(',')).join('\n');
  return `${headers}\n${exampleRows}`;
}

const REQUIRED_KEYS = CSV_COLUMNS.filter(c => c.required).map(c => c.key);

/* ── EAN-13 Generator ──────────────────────────────────────────────── */
function generateEan13(): string {
  const prefix = '880';
  const store = '0001';
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  const digits = (prefix + store + seq).split('').map(Number);
  const check = (10 - (digits.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
  return digits.join('') + check;
}

/* ── Types ─────────────────────────────────────────────────────────── */
interface ImportRow {
  _rowNum: number;
  _errors: string[];
  _valid: boolean;
  [key: string]: any;
}

/* ── CSV Parser ────────────────────────────────────────────────────── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Map CSV header labels to internal keys
  const HEADER_ALIASES: Record<string, string> = {
    'product_name': 'name', 'product name': 'name',
    'cost_price': 'cost', 'cost price': 'cost',
    'discount_type': 'discount_type', 'discount type': 'discount_type',
    'short_description': 'short_description', 'short description': 'short_description',
    'image_urls': 'image_urls', 'image urls': 'image_urls',
    'has_variants': 'has_variants', 'has variants': 'has_variants',
    'variant_options': 'variant_options', 'variant options': 'variant_options',
    'variant_prices': 'variant_prices', 'variant prices': 'variant_prices',
    'variant_discounts': 'variant_discounts', 'variant discounts': 'variant_discounts',
    'variant_stocks': 'variant_stocks', 'variant stocks': 'variant_stocks',
    'variant_skus': 'variant_skus', 'variant skus': 'variant_skus',
    'variant_barcodes': 'variant_barcodes', 'variant barcodes': 'variant_barcodes',
  };

  const rawHeaders = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_ ]/g, '').trim());
  const headers = rawHeaders.map(h => {
    const normalized = h.replace(/\s+/g, '_');
    return HEADER_ALIASES[h] || HEADER_ALIASES[normalized] || normalized;
  });

  return lines.slice(1).map(line => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

/* ── Row Validator ─────────────────────────────────────────────────── */
function validateRow(row: Record<string, string>, rowNum: number): ImportRow {
  const errors: string[] = [];
  if (!row.name?.trim()) errors.push('Name is required');
  if (!row.price || isNaN(Number(row.price)) || Number(row.price) < 0) errors.push('Price must be a valid positive number');
  if (!row.stock || isNaN(Number(row.stock)) || Number(row.stock) < 0) errors.push('Stock must be a valid non-negative number');
  if (row.discount && isNaN(Number(row.discount))) errors.push('Discount must be a valid number');
  if (row.discount_type && !['flat', 'percent', ''].includes(row.discount_type.toLowerCase())) errors.push('Discount type must be "flat" or "percent"');
  if (row.cost && isNaN(Number(row.cost))) errors.push('Cost must be a valid number');
  const hv = (row.has_variants || '').trim().toLowerCase();
  if (hv && !['yes', 'no', 'true', 'false'].includes(hv)) errors.push('Has variants must be "yes" or "no"');
  // Category/subcategory ID validation -- IDs must exist, names can be new
  if (row.category?.trim() && /^\d+$/.test(row.category.trim())) {
    if (!PRODUCT_CATEGORIES.find(c => c.id === Number(row.category.trim()))) errors.push(`Category ID ${row.category} not found`);
  }
  if (row.subcategory?.trim() && /^\d+$/.test(row.subcategory.trim())) {
    if (!PRODUCT_CATEGORIES.find(c => c.id === Number(row.subcategory.trim()))) errors.push(`Subcategory ID ${row.subcategory} not found`);
  }
  if (row.brand?.trim() && /^\d+$/.test(row.brand.trim())) {
    if (!PRODUCT_BRANDS.find(b => b.id === Number(row.brand.trim()))) errors.push(`Brand ID ${row.brand} not found`);
  }

  return {
    ...row,
    _rowNum: rowNum,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

/* ── Template Generator ────────────────────────────────────────────── */
function quoteCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}

/* ── Resolve category/subcategory/brand by name or ID ──────────────── */
function resolveCategory(val: string): { found: boolean; isId: boolean; name: string } {
  if (!val.trim()) return { found: false, isId: false, name: '' };
  const isNum = /^\d+$/.test(val.trim());
  if (isNum) {
    const cat = PRODUCT_CATEGORIES.find(c => c.id === Number(val.trim()));
    return { found: !!cat, isId: true, name: cat?.name || val };
  }
  const cat = PRODUCT_CATEGORIES.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
  return { found: !!cat, isId: false, name: val };
}

function resolveBrand(val: string): { found: boolean; isId: boolean; name: string } {
  if (!val.trim()) return { found: false, isId: false, name: '' };
  const isNum = /^\d+$/.test(val.trim());
  if (isNum) {
    const brand = PRODUCT_BRANDS.find(b => b.id === Number(val.trim()));
    return { found: !!brand, isId: true, name: brand?.name || val };
  }
  const brand = PRODUCT_BRANDS.find(b => b.name.toLowerCase() === val.trim().toLowerCase());
  return { found: !!brand, isId: false, name: val };
}

/* ── Parse variant combos from a row ───────────────────────────────── */
function parseVariants(row: Record<string, string>) {
  const hv = (row.has_variants || '').trim().toLowerCase();
  if (hv !== 'yes' && hv !== 'true') return [];
  const optParts = (row.variant_options || '').split('|').filter(Boolean);
  const optNames: string[] = [];
  const optValues: string[][] = [];
  optParts.forEach(p => {
    const [name, vals] = p.split(':');
    if (name && vals) {
      optNames.push(name.trim());
      optValues.push(vals.split(';').map(v => v.trim()));
    }
  });
  // Cartesian product
  const combos: string[][] = optValues.length === 0 ? [] :
    optValues.reduce<string[][]>((acc, arr) => acc.flatMap(a => arr.map(v => [...a, v])), [[]]);

  const prices = (row.variant_prices || '').split(';');
  const discounts = (row.variant_discounts || '').split(';');
  const stocks = (row.variant_stocks || '').split(';');
  const skus = (row.variant_skus || '').split(';');
  const barcodes = (row.variant_barcodes || '').split(';');

  return combos.map((combo, i) => ({
    label: combo.join(' / '),
    optionPairs: optNames.map((n, j) => ({ name: n, value: combo[j] })),
    price: prices[i]?.trim() || row.price || '',
    discount: discounts[i]?.trim() || '',
    stock: stocks[i]?.trim() || '0',
    sku: skus[i]?.trim() || '',
    barcode: barcodes[i]?.trim() || '',
  }));
}

/* ── Main Component ────────────────────────────────────────────────── */
export function ProductImportWizard({ onClose, onImport }: {
  onClose: () => void;
  onImport: (products: ImportRow[]) => void;
}) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [collapsedProducts, setCollapsedProducts] = useState<Set<number>>(new Set());
  // Per-product bulk apply: key = "rowIdx-field", value = { enabled, value }
  const [perProductBulk, setPerProductBulk] = useState<Record<string, { enabled: boolean; value: string }>>({});
  const [productImages, setProductImages] = useState<Record<number, string[]>>({});
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});  // key: "rowIdx-variantIdx"
  const [expandedImageCard, setExpandedImageCard] = useState<number | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{ success: number; errors: { row: number; name: string; error: string }[] } | null>(null);
  const [showGuide, setShowGuide] = useState<TemplateType | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validCount = rows.filter(r => r._valid).length;
  const errorCount = rows.filter(r => !r._valid).length;
  const missingProductBarcodes = rows.filter(r => r._valid && !r.barcode?.trim()).length;
  const missingVariantBarcodes = rows.filter(r => {
    if (!r._valid) return false;
    const hv = (r.has_variants || '').trim().toLowerCase();
    if (hv !== 'yes' && hv !== 'true') return false;
    const existing = (r.variant_barcodes || '').split(';').filter((b: string) => b.trim());
    const variantCount = (r.variant_stocks || r.variant_prices || '').split(';').length;
    return existing.length < variantCount;
  }).length;
  const missingBarcodes = missingProductBarcodes + missingVariantBarcodes;

  /* ── File handling ─────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      alert('Please upload a .csv, .xlsx, or .xls file');
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = parsed.map((row, i) => validateRow(row, i + 1));
      setRows(validated);
      setStep(2);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── Template download ─────────────────────────────── */
  /* ── Row editing ───────────────────────────────────── */
  const updateCell = (rowIdx: number, key: string, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const updated = { ...r, [key]: value };
      const revalidated = validateRow(updated, r._rowNum);
      return revalidated;
    }));
  };

  const deleteSelectedRows = () => {
    setRows(prev => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  };

  const deleteRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setSelectedRows(prev => { const n = new Set(prev); n.delete(idx); return n; });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? new Set(rows.map((_, i) => i)) : new Set());
  };

  const toggleSelect = (idx: number) => {
    setSelectedRows(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  /* ── Per-product bulk helpers ────────────────────────────── */
  const getPerProductBulk = (rowIdx: number, field: string) =>
    perProductBulk[`${rowIdx}-${field}`] || { enabled: false, value: '' };

  const setPerProductBulkField = (rowIdx: number, field: string, enabled: boolean, value: string) => {
    setPerProductBulk(prev => ({ ...prev, [`${rowIdx}-${field}`]: { enabled, value } }));
  };

  // Apply same value to all variants of a product
  const applyToProductVariants = (rowIdx: number, variantField: 'variant_prices' | 'variant_discounts' | 'variant_stocks' | 'variant_skus' | 'variant_barcodes', value: string, divide?: boolean) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const variantCount = Math.max(
        (r.variant_stocks || '').split(';').filter((s: string) => s.trim()).length,
        (r.variant_prices || '').split(';').filter((s: string) => s.trim()).length,
        1
      );
      let values: string[];
      if (divide && variantCount > 0) {
        const total = parseInt(value) || 0;
        const perVariant = Math.floor(total / variantCount);
        const remainder = total - (perVariant * variantCount);
        values = Array.from({ length: variantCount }, (_, vi) =>
          String(vi < variantCount - 1 ? perVariant : perVariant + remainder)
        );
      } else {
        values = Array(variantCount).fill(value);
      }
      const updated = { ...r, [variantField]: values.join(';') };
      return validateRow(updated, r._rowNum);
    }));
  };

  /* ── Update a specific variant's field ───────────────────── */
  const updateVariantCell = (rowIdx: number, variantIdx: number, field: 'variant_prices' | 'variant_discounts' | 'variant_stocks' | 'variant_skus' | 'variant_barcodes', value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const parts = (r[field] || '').split(';');
      while (parts.length <= variantIdx) parts.push('');
      parts[variantIdx] = value;
      const updated = { ...r, [field]: parts.join(';') };
      return validateRow(updated, r._rowNum);
    }));
  };

  /* ── Generate missing barcodes (product + variant level) ── */
  const generateMissingBarcodes = () => {
    setRows(prev => prev.map(r => {
      if (!r._valid) return r;
      let updated = { ...r };

      // Product barcode
      if (!updated.barcode?.trim()) {
        updated.barcode = generateEan13();
      }

      // Variant barcodes
      const hv = (updated.has_variants || '').trim().toLowerCase();
      if (hv === 'yes' || hv === 'true') {
        const variantCount = Math.max(
          (updated.variant_stocks || '').split(';').filter((s: string) => s.trim()).length,
          (updated.variant_prices || '').split(';').filter((s: string) => s.trim()).length,
          1
        );
        const existing = (updated.variant_barcodes || '').split(';');
        const base = Math.floor(Math.random() * 90000) + 10000;
        const filled = Array.from({ length: variantCount }, (_, i) => {
          if (existing[i]?.trim()) return existing[i].trim();
          const prefix = '880';
          const store = '0001';
          const seq = String(base + i).padStart(5, '0');
          const digits = (prefix + store + seq).split('').map(Number);
          const check = (10 - (digits.reduce((s, v, idx) => s + v * (idx % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
          return digits.join('') + String(check);
        });
        updated.variant_barcodes = filled.join(';');
      }

      return updated;
    }));
  };

  /* ── Confirm import ────────────────────────────────── */
  const confirmImport = () => {
    const validRows = rows.filter(r => r._valid);
    const errors = rows.filter(r => !r._valid).map(r => ({
      row: r._rowNum,
      name: r.name || '(unnamed)',
      error: r._errors.join(', '),
    }));

    setImportResult({ success: validRows.length, errors });
    onImport(validRows);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[95vw] max-w-[1400px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 px-4 md:px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 md:block">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Import Products</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {step === 1 && 'Upload a CSV or Excel file with your product data'}
                {step === 2 && `Preview and edit ${rows.length} products before importing`}
                {step === 3 && 'Import complete -- add images next'}
                {step === 4 && 'Add product images'}
              </p>
            </div>
            {/* Close button — sits beside title on mobile so it's reachable, hidden on desktop where it lives next to the steps */}
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 -mt-1"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between md:justify-start gap-1.5 md:gap-2 w-full md:w-auto">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                    s < step ? 'bg-green-500 text-white' :
                    s === step ? 'bg-gray-900 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {s < step ? <Check size={12} /> : s}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${s === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {s === 1 ? 'Upload' : s === 2 ? 'Preview' : s === 3 ? 'Results' : 'Images'}
                  </span>
                  {/* Connector line — desktop only; on mobile we drop it so 4 steps fit without scrolling */}
                  {s < 4 && <div className={`hidden md:block w-6 h-px shrink-0 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        {/* ═══════════════ STEP 1: Upload ═══════════════ */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Upload area */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl py-10 px-6 flex flex-col items-center justify-center gap-3 hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Upload size={22} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Drag & drop your file here</p>
                <p className="text-xs text-gray-500 mt-0.5">or click to browse -- CSV, XLSX, XLS</p>
              </div>
              <Button variant="secondary" size="sm">Choose File</Button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />

            {/* Template type selection */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Download a template to get started</p>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATE_TYPES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      const csv = generateTemplateForType(t.key);
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `import-template-${t.key}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowGuide(t.key);
                    }}
                    className="text-left p-3 border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {t.icon === 'box' && <Package size={14} className="text-gray-400 group-hover:text-gray-600" />}
                      {t.icon === 'boxes' && <Layers size={14} className="text-gray-400 group-hover:text-gray-600" />}
                      {t.icon === 'file' && <FileSpreadsheet size={14} className="text-blue-400 group-hover:text-blue-600" />}
                      {t.icon === 'files' && <Layers size={14} className="text-blue-400 group-hover:text-blue-600" />}
                      <span className="text-xs font-semibold text-gray-800">{t.label}</span>
                      <Download size={12} className="text-gray-300 ml-auto group-hover:text-gray-500" />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Column guide - expandable, shows columns for selected template */}
            <div className="mt-4">
              <button type="button" onClick={() => setShowGuide(showGuide ? null : 'physical')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                {showGuide ? 'Hide' : 'Show'} column guide
                <ChevronDown size={12} className={`transition-transform ${showGuide ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showGuide && (
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                {/* Template type tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50">
                  {TEMPLATE_TYPES.map(t => (
                    <button key={t.key} type="button"
                      onClick={() => setShowGuide(t.key)}
                      className={`px-3 py-2 text-[11px] font-medium transition-colors ${
                        showGuide === t.key
                          ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >{t.label}</button>
                  ))}
                </div>

                <div className="overflow-x-auto -mx-4 px-4 md:-mx-0 md:px-0">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-[140px]">Column</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-[60px]">Required</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">What to put here</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-[160px]">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {getColumnsForTemplate(showGuide as TemplateType).map(col => (
                      <tr key={col.key} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-700">{col.label}</td>
                        <td className="px-3 py-2">
                          {col.required ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">Required</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 leading-snug">{col.desc}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">{col.example || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Variant format tip - only show when variant template selected */}
            {showGuide && (showGuide === 'physical-variant' || showGuide === 'digital-variant') && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-medium text-blue-800 mb-1">How variants work in CSV</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>Variant Options:</strong> <code className="bg-blue-100 px-1 rounded">Color:Red;Blue|Size:S;M;L</code> creates 6 combinations (Red/S, Red/M, Red/L, Blue/S, Blue/M, Blue/L)<br />
                  <strong>Variant Prices:</strong> One price per combination, separated by <code className="bg-blue-100 px-1 rounded">;</code> -- e.g. <code className="bg-blue-100 px-1 rounded">500;500;550;500;500;550</code><br />
                  <strong>Same for stocks, SKUs, barcodes</strong> -- all follow the same order as the combinations above.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ STEP 2: Preview & Edit ═══════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Summary bar */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-700">{fileName}</span>
              </div>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-600">{rows.length} products</span>
              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{validCount} valid</span>
              {errorCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{errorCount} errors</span>
              )}
              <span className="text-xs text-gray-400">|</span>
              {missingBarcodes > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-700">
                    {missingProductBarcodes > 0 ? `${missingProductBarcodes} product` : ''}
                    {missingProductBarcodes > 0 && missingVariantBarcodes > 0 ? ' + ' : ''}
                    {missingVariantBarcodes > 0 ? `${missingVariantBarcodes} variant` : ''} barcodes missing
                  </span>
                  <button type="button" onClick={generateMissingBarcodes}
                    className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition-colors flex items-center gap-1">
                    <RefreshCw size={10} /> Generate all
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-green-600">All barcodes set</span>
              )}

              {selectedRows.size > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">{selectedRows.size} selected</span>
                  <Button variant="secondary" size="sm" onClick={deleteSelectedRows}><Trash2 size={12} /> Delete</Button>
                </div>
              )}
            </div>

            {/* Hierarchical tree view */}
            <div className="flex-1 overflow-auto">
              <div style={{ minWidth: 900 }}>
              {/* Header */}
              <div className="sticky top-0 z-10 grid grid-cols-[32px_28px_1fr_80px_100px_70px_80px_80px_44px_32px] gap-0 bg-gray-50 border-b border-gray-200 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                <div className="px-2 py-2.5 flex items-center">
                  <input type="checkbox" checked={selectedRows.size === rows.length && rows.length > 0}
                    onChange={e => toggleSelectAll(e.target.checked)} className="rounded" />
                </div>
                <div className="px-1 py-2.5">#</div>
                <div className="px-2 py-2.5">Product / Variant</div>
                <div className="px-2 py-2.5">Price</div>
                <div className="px-2 py-2.5">Discount</div>
                <div className="px-2 py-2.5">Stock</div>
                <div className="px-2 py-2.5">SKU</div>
                <div className="px-2 py-2.5">Barcode</div>
                <div className="px-2 py-2.5 text-center">OK</div>
                <div></div>
              </div>

              {/* Product rows */}
              <div className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const hasV = row.has_variants?.trim().toLowerCase() === 'yes' || row.has_variants?.trim().toLowerCase() === 'true';
                  const variants = hasV ? parseVariants(row) : [];
                  const isCollapsed = collapsedProducts.has(i);
                  const totalVariantStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);

                  return (
                    <div key={i}>
                      {/* ── Product parent row ─── */}
                      <div className={`grid grid-cols-[32px_28px_1fr_80px_100px_70px_80px_80px_44px_32px] gap-0 items-center ${!row._valid ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                        <div className="px-2 py-2">
                          <input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleSelect(i)} className="rounded" />
                        </div>
                        <div className="px-1 py-2 text-[10px] text-gray-400">{row._rowNum}</div>
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {hasV && (
                              <button type="button" onClick={() => setCollapsedProducts(prev => {
                                const n = new Set(prev);
                                n.has(i) ? n.delete(i) : n.add(i);
                                return n;
                              })} className="text-gray-400 hover:text-gray-600 shrink-0">
                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <input type="text" value={row.name || ''} onChange={e => updateCell(i, 'name', e.target.value)}
                                className={`w-full h-7 px-2 text-xs font-medium border rounded outline-none ${!row.name?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-gray-400`} />
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {/* Category */}
                                {(() => {
                                  const r = resolveCategory(row.category || '');
                                  return (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[8px] text-gray-400 font-medium shrink-0">Cat:</span>
                                      <input type="text" value={row.category || ''} onChange={e => updateCell(i, 'category', e.target.value)}
                                        placeholder="Category"
                                        className={`h-5 px-1.5 text-[9px] border rounded outline-none focus:border-gray-400 w-24 ${
                                          row.category?.trim() ? (r.isId && !r.found ? 'border-red-300 bg-red-50' : r.found ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50') : 'border-gray-200 bg-gray-50'
                                        }`} />
                                      {row.category?.trim() && r.isId && !r.found && (
                                        <span className="text-[8px] text-red-500" title="ID not found">ID?</span>
                                      )}
                                      {row.category?.trim() && !r.isId && !r.found && (
                                        <span className="text-[8px] text-amber-500" title="Name not found, will be created">New</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                {/* Subcategory */}
                                {(() => {
                                  const r = resolveCategory(row.subcategory || '');
                                  return (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[8px] text-gray-400 font-medium shrink-0">Sub:</span>
                                      <input type="text" value={row.subcategory || ''} onChange={e => updateCell(i, 'subcategory', e.target.value)}
                                        placeholder="Subcat"
                                        className={`h-5 px-1.5 text-[9px] border rounded outline-none focus:border-gray-400 w-24 ${
                                          row.subcategory?.trim() ? (r.isId && !r.found ? 'border-red-300 bg-red-50' : r.found ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50') : 'border-gray-200 bg-gray-50'
                                        }`} />
                                      {row.subcategory?.trim() && r.isId && !r.found && (
                                        <span className="text-[8px] text-red-500" title="ID not found">ID?</span>
                                      )}
                                      {row.subcategory?.trim() && !r.isId && !r.found && (
                                        <span className="text-[8px] text-amber-500" title="Name not found, will be created">New</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                {/* Brand */}
                                {(() => {
                                  const r = resolveBrand(row.brand || '');
                                  return (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[8px] text-gray-400 font-medium shrink-0">Brand:</span>
                                      <input type="text" value={row.brand || ''} onChange={e => updateCell(i, 'brand', e.target.value)}
                                        placeholder="Brand"
                                        className={`h-5 px-1.5 text-[9px] border rounded outline-none focus:border-gray-400 w-20 ${
                                          row.brand?.trim() ? (r.isId && !r.found ? 'border-red-300 bg-red-50' : r.found ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50') : 'border-gray-200 bg-gray-50'
                                        }`} />
                                      {row.brand?.trim() && r.isId && !r.found && (
                                        <span className="text-[8px] text-red-500" title="ID not found">ID?</span>
                                      )}
                                      {row.brand?.trim() && !r.isId && !r.found && (
                                        <span className="text-[8px] text-amber-500" title="Not in system, will be added">New</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                {hasV && <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">{variants.length} variants</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Price */}
                        <div className="px-2 py-2">
                          {!hasV ? (
                            <input type="number" min="0" step="0.01" value={row.price || ''} onChange={e => updateCell(i, 'price', e.target.value)}
                              className={`w-full h-7 px-2 text-xs border rounded outline-none ${(!row.price || Number(row.price) < 0) ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-gray-400`} />
                          ) : (
                            <div>
                              <label className="flex items-center gap-1 mb-1 cursor-pointer">
                                <input type="checkbox" checked={getPerProductBulk(i, 'price').enabled}
                                  onChange={e => setPerProductBulkField(i, 'price', e.target.checked, getPerProductBulk(i, 'price').value)}
                                  className="rounded w-3 h-3" />
                                <span className="text-[8px] text-gray-400">Same</span>
                              </label>
                              {getPerProductBulk(i, 'price').enabled && (
                                <input type="number" min="0" step="0.01" placeholder="Price"
                                  value={getPerProductBulk(i, 'price').value}
                                  onChange={e => {
                                    setPerProductBulkField(i, 'price', true, e.target.value);
                                    applyToProductVariants(i, 'variant_prices', e.target.value);
                                  }}
                                  className="w-full h-6 px-1.5 text-[10px] border border-blue-200 rounded outline-none focus:border-blue-400" />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Discount */}
                        <div className="px-2 py-2">
                          {!hasV ? (
                            <div className="flex gap-0">
                              <input type="number" min="0" step="0.01" value={row.discount || ''} onChange={e => updateCell(i, 'discount', e.target.value)}
                                className="w-14 h-7 px-1.5 text-xs border border-gray-200 rounded-l outline-none focus:border-gray-400" />
                              <button type="button" onClick={() => updateCell(i, 'discount_type', (row.discount_type || 'flat') === 'flat' ? 'percent' : 'flat')}
                                className="h-7 px-1.5 bg-gray-50 border border-l-0 border-gray-200 rounded-r text-[10px] font-medium text-gray-500 hover:bg-gray-100">
                                {(row.discount_type || 'flat') === 'flat' ? '\u09F3' : '%'}
                              </button>
                            </div>
                          ) : (
                            <div>
                              <label className="flex items-center gap-1 mb-1 cursor-pointer">
                                <input type="checkbox" checked={getPerProductBulk(i, 'discount').enabled}
                                  onChange={e => setPerProductBulkField(i, 'discount', e.target.checked, getPerProductBulk(i, 'discount').value)}
                                  className="rounded w-3 h-3" />
                                <span className="text-[8px] text-gray-400">Same</span>
                              </label>
                              {getPerProductBulk(i, 'discount').enabled && (
                                <div className="flex gap-0">
                                  <input type="number" min="0" step="0.01" placeholder="Disc."
                                    value={getPerProductBulk(i, 'discount').value}
                                    onChange={e => {
                                      setPerProductBulkField(i, 'discount', true, e.target.value);
                                      applyToProductVariants(i, 'variant_discounts', e.target.value);
                                    }}
                                    className="w-full h-6 px-1.5 text-[10px] border border-blue-200 rounded-l outline-none focus:border-blue-400" />
                                  <button type="button"
                                    onClick={() => updateCell(i, 'discount_type', (row.discount_type || 'flat') === 'flat' ? 'percent' : 'flat')}
                                    className="h-6 px-1.5 bg-blue-50 border border-l-0 border-blue-200 rounded-r text-[9px] font-medium text-blue-600 hover:bg-blue-100 transition-colors shrink-0">
                                    {(row.discount_type || 'flat') === 'flat' ? '\u09F3' : '%'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Stock */}
                        <div className="px-2 py-2">
                          {!hasV ? (
                            <input type="number" min="0" value={row.stock || ''} onChange={e => updateCell(i, 'stock', e.target.value)}
                              className={`w-full h-7 px-2 text-xs border rounded outline-none ${(!row.stock || Number(row.stock) < 0) ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:border-gray-400`} />
                          ) : (
                            <div>
                              <label className="flex items-center gap-1 mb-1 cursor-pointer">
                                <input type="checkbox" checked={getPerProductBulk(i, 'stock').enabled}
                                  onChange={e => setPerProductBulkField(i, 'stock', e.target.checked, getPerProductBulk(i, 'stock').value)}
                                  className="rounded w-3 h-3" />
                                <span className="text-[8px] text-gray-400">Divide</span>
                              </label>
                              {getPerProductBulk(i, 'stock').enabled && (
                                <input type="number" min="0" placeholder="Total"
                                  value={getPerProductBulk(i, 'stock').value}
                                  onChange={e => {
                                    setPerProductBulkField(i, 'stock', true, e.target.value);
                                    applyToProductVariants(i, 'variant_stocks', e.target.value, true);
                                  }}
                                  className="w-full h-6 px-1.5 text-[10px] border border-blue-200 rounded outline-none focus:border-blue-400" />
                              )}
                              {!getPerProductBulk(i, 'stock').enabled && (
                                <span className="text-[10px] font-medium text-gray-700">{totalVariantStock} total</span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* SKU */}
                        <div className="px-2 py-2">
                          {!hasV ? (
                            <input type="text" value={row.sku || ''} onChange={e => updateCell(i, 'sku', e.target.value)}
                              className="w-full h-7 px-1.5 text-xs border border-gray-200 rounded outline-none focus:border-gray-400" />
                          ) : (
                            <div>
                              <label className="flex items-center gap-1 mb-1 cursor-pointer">
                                <input type="checkbox" checked={getPerProductBulk(i, 'sku').enabled}
                                  onChange={e => setPerProductBulkField(i, 'sku', e.target.checked, getPerProductBulk(i, 'sku').value)}
                                  className="rounded w-3 h-3" />
                                <span className="text-[8px] text-gray-400">Prefix</span>
                              </label>
                              {getPerProductBulk(i, 'sku').enabled && (
                                <input type="text" placeholder="e.g. KRT"
                                  value={getPerProductBulk(i, 'sku').value}
                                  onChange={e => {
                                    const prefix = e.target.value;
                                    setPerProductBulkField(i, 'sku', true, prefix);
                                    // Auto-number: KRT-001, KRT-002, etc.
                                    setRows(prev => prev.map((r, ri) => {
                                      if (ri !== i) return r;
                                      const count = Math.max(
                                        (r.variant_stocks || '').split(';').filter((s: string) => s.trim()).length,
                                        (r.variant_prices || '').split(';').filter((s: string) => s.trim()).length,
                                        1
                                      );
                                      const skus = Array.from({ length: count }, (_, vi) => `${prefix}-${String(vi + 1).padStart(3, '0')}`);
                                      const { _rowNum, _errors, _valid, ...rest } = r;
                                      return validateRow({ ...rest, variant_skus: skus.join(';') } as Record<string, string>, _rowNum);
                                    }));
                                  }}
                                  className="w-full h-6 px-1.5 text-[10px] border border-blue-200 rounded outline-none focus:border-blue-400" />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Barcode */}
                        <div className="px-2 py-2">
                          {!hasV ? (
                            <div className="flex gap-0.5">
                              <input type="text" value={row.barcode || ''} onChange={e => updateCell(i, 'barcode', e.target.value)}
                                placeholder="Auto" className="w-full h-7 px-1 text-[10px] border border-gray-200 rounded outline-none focus:border-gray-400" />
                            </div>
                          ) : (
                            <div>
                              <label className="flex items-center gap-1 mb-1 cursor-pointer">
                                <input type="checkbox" checked={getPerProductBulk(i, 'barcode').enabled}
                                  onChange={e => {
                                    setPerProductBulkField(i, 'barcode', e.target.checked, 'auto');
                                    if (e.target.checked) {
                                      // Auto-generate barcodes for this product's variants
                                      setRows(prev => prev.map((r, ri) => {
                                        if (ri !== i) return r;
                                        const count = Math.max(
                                          (r.variant_stocks || '').split(';').filter((s: string) => s.trim()).length,
                                          (r.variant_prices || '').split(';').filter((s: string) => s.trim()).length,
                                          1
                                        );
                                        const base = Math.floor(Math.random() * 90000) + 10000;
                                        const barcodes = Array.from({ length: count }, (_, vi) => {
                                          const prefix = '880';
                                          const store = '0001';
                                          const seq = String(base + vi).padStart(5, '0');
                                          const digits = (prefix + store + seq).split('').map(Number);
                                          const check = (10 - (digits.reduce((s, v, idx) => s + v * (idx % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
                                          return digits.join('') + String(check);
                                        });
                                        const { _rowNum, _errors, _valid, ...rest } = r;
                                        return validateRow({ ...rest, variant_barcodes: barcodes.join(';') } as Record<string, string>, _rowNum);
                                      }));
                                    }
                                  }}
                                  className="rounded w-3 h-3" />
                                <span className="text-[8px] text-gray-400">Auto</span>
                              </label>
                              {getPerProductBulk(i, 'barcode').enabled && (
                                <span className="text-[9px] text-green-600 font-medium">Generated</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-2 flex justify-center">
                          {row._valid ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center" title="Valid">
                              <Check size={10} className="text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center" title={row._errors.join('\n')}>
                              <AlertTriangle size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="px-1 py-2">
                          <button onClick={() => deleteRow(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* ── Variant child rows (editable) ─── */}
                      {hasV && !isCollapsed && variants.map((v, vi) => (
                        <div key={vi} className="grid grid-cols-[32px_28px_1fr_80px_100px_70px_80px_80px_44px_32px] gap-0 items-center bg-gray-50/30 border-t border-gray-50">
                          <div className="px-2 py-1.5"></div>
                          <div className="px-1 py-1.5"></div>
                          <div className="px-2 py-1.5 pl-10">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-300 text-[10px]">&#9492;</span>
                              {v.optionPairs.map((op, opi) => (
                                <span key={opi} className="text-[9px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                                  <span className="text-gray-400">{op.name}:</span> {op.value}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="px-2 py-1.5">
                            <input type="number" min="0" step="0.01" value={v.price}
                              onChange={e => updateVariantCell(i, vi, 'variant_prices', e.target.value)}
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-200 rounded outline-none focus:border-gray-400" />
                          </div>
                          <div className="px-2 py-1.5">
                            <input type="number" min="0" step="0.01" value={v.discount}
                              onChange={e => updateVariantCell(i, vi, 'variant_discounts', e.target.value)}
                              placeholder="--"
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-200 rounded outline-none focus:border-gray-400" />
                            {v.discount && parseFloat(v.price) > 0 && (
                              <p className="text-[8px] text-green-600 mt-0.5">
                                {(row.discount_type || 'flat') === 'percent'
                                  ? `\u09F3${(parseFloat(v.price) * (1 - parseFloat(v.discount) / 100)).toFixed(0)}`
                                  : `\u09F3${(parseFloat(v.price) - parseFloat(v.discount)).toFixed(0)}`
                                }
                              </p>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <input type="number" min="0" value={v.stock}
                              onChange={e => updateVariantCell(i, vi, 'variant_stocks', e.target.value)}
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-200 rounded outline-none focus:border-gray-400" />
                          </div>
                          <div className="px-2 py-1.5">
                            <input type="text" value={v.sku}
                              onChange={e => updateVariantCell(i, vi, 'variant_skus', e.target.value)}
                              placeholder="SKU"
                              className="w-full h-6 px-1.5 text-[10px] border border-gray-200 rounded outline-none focus:border-gray-400" />
                          </div>
                          <div className="px-2 py-1.5">
                            <div className="flex gap-0.5">
                              <input type="text" value={v.barcode}
                                onChange={e => updateVariantCell(i, vi, 'variant_barcodes', e.target.value)}
                                placeholder="Auto"
                                className="w-full h-6 px-1 text-[9px] border border-gray-200 rounded outline-none focus:border-gray-400 font-mono" />
                            </div>
                          </div>
                          <div></div>
                          <div></div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Error summary */}
            {errorCount > 0 && (
              <div className="px-6 py-2 border-t border-gray-100 bg-red-50 max-h-20 overflow-y-auto">
                {rows.filter(r => !r._valid).map(r => (
                  <p key={r._rowNum} className="text-[11px] text-red-700">
                    Row {r._rowNum} ({r.name || 'unnamed'}): {r._errors.join(', ')}
                  </p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => { setStep(1); setRows([]); setFileName(''); }}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-500">
                  {validCount} product{validCount !== 1 ? 's' : ''} will be imported as <strong>Draft</strong>
                </p>
                <Button size="sm" disabled={validCount === 0} onClick={confirmImport}>
                  <Check size={14} /> Import {validCount} product{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3: Results ═══════════════ */}
        {step === 3 && importResult && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={32} className="text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {importResult.success} product{importResult.success !== 1 ? 's' : ''} imported
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  All products have been added as <strong>Draft</strong>. Add images next to complete them.
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <p className="text-xs font-medium text-amber-800">{importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} skipped due to errors</p>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-amber-700 py-0.5">
                      Row {err.row} ({err.name}): {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-6">
              <Button variant="secondary" size="sm" onClick={onClose}>Skip Images & Close</Button>
              <Button size="sm" onClick={() => setStep(4)}>
                <Upload size={14} /> Add Images
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 4: Add Images ═══════════════ */}
        {step === 4 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Info bar */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">
                  {rows.filter(r => r._valid).length} products -- {Object.keys(productImages).filter(k => productImages[Number(k)]?.length > 0).length} with images
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
              </div>
            </div>

            {/* Image upload grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rows.filter(r => r._valid).map((row, i) => {
                  const images = productImages[i] || [];
                  const hasV = row.has_variants?.trim().toLowerCase() === 'yes' || row.has_variants?.trim().toLowerCase() === 'true';

                  return (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Image area */}
                      <MultiImageUpload
                        values={productImages[i] || []}
                        onChange={(urls) => setProductImages(prev => ({ ...prev, [i]: urls }))}
                        maxFiles={8}
                        cropWidth={800}
                        cropHeight={800}
                        cropLabel="Crop Product Image"
                      />

                      {/* Product info */}
                      <div className="px-3 py-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-900 truncate">{row.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {row.category && <span className="text-[9px] text-gray-400">{row.category}</span>}
                          {hasV && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                              {parseVariants(row).length} variants
                            </span>
                          )}
                          <span className="text-[9px] ml-auto flex items-center gap-1">
                            {row.discount && parseFloat(row.price) > 0 ? (
                              <>
                                <span className="text-green-600 font-medium">
                                  {'\u09F3'}{(row.discount_type || 'flat') === 'percent'
                                    ? (parseFloat(row.price) * (1 - parseFloat(row.discount) / 100)).toFixed(0)
                                    : (parseFloat(row.price) - parseFloat(row.discount)).toFixed(0)
                                  }
                                </span>
                                <span className="text-gray-400 line-through">{'\u09F3'}{row.price}</span>
                              </>
                            ) : (
                              <span className="text-gray-500">{'\u09F3'}{row.price || '0'}</span>
                            )}
                          </span>
                        </div>
                        {images.length === 0 && (
                          <p className="text-[9px] text-amber-500 mt-1">No images yet</p>
                        )}
                      </div>

                      {/* Variant images (expandable) */}
                      {hasV && (
                        <div className="border-t border-gray-100">
                          <button type="button"
                            onClick={() => setExpandedImageCard(expandedImageCard === i ? null : i)}
                            className="w-full px-3 py-2 flex items-center justify-between bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                            <span className="text-[9px] font-medium text-gray-500 uppercase flex items-center gap-1">
                              {expandedImageCard === i ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              {parseVariants(row).length} Variant Images
                            </span>
                            <label className="flex items-center gap-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={variantImages[`${i}-useSame`] === 'true'}
                                onChange={e => setVariantImages(prev => ({ ...prev, [`${i}-useSame`]: e.target.checked ? 'true' : 'false' }))}
                                className="rounded w-3 h-3" />
                              <span className="text-[8px] text-gray-400">Use product image for all</span>
                            </label>
                          </button>
                          {expandedImageCard === i && <div className="px-3 py-2 bg-gray-50/50">
                          {variantImages[`${i}-useSame`] === 'true' ? (
                            <p className="text-[9px] text-green-600">All variants will use the main product image</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {parseVariants(row).map((v, vi) => {
                                const key = `${i}-${vi}`;
                                return (
                                  <div key={vi} className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-lg">
                                    <ImageUpload
                                      value={variantImages[key] || ''}
                                      onChange={(url) => setVariantImages(prev => ({ ...prev, [key]: url }))}
                                      variant="square"
                                      cropWidth={800}
                                      cropHeight={800}
                                      cropLabel="Crop Variant Image"
                                      className="w-12 h-12"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] text-gray-700 truncate">{v.label}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          </div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
