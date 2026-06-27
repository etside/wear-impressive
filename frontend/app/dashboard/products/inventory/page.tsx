'use client';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  SlidersHorizontal, Download, Upload, Search, AlertTriangle, X,
  TrendingUp, TrendingDown, Minus, History, Package, ArrowUpDown,
  Plus, RefreshCw, Filter, Check, ChevronDown, ChevronRight, Barcode,
  Loader2,
} from "lucide-react";
import { ProductImportWizard } from "@/components/dashboard/product-import-wizard";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { BarcodeModal, type BarcodeItem } from "@/components/dashboard/barcode-modal";
import { BarcodeScanner } from "@/components/dashboard/barcode-scanner";
import { useLang } from "@/lib/i18n/context";
import { branchesApi, inventoryLogsApi, type BranchStockItem, type AdjustStockPayload } from "@/lib/api/services/vendor-inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { InventoryLog } from "@/lib/api/types";

const statusConfigMap = {
  inStock:    { variant: "success" as const, label: "In Stock" },
  lowStock:   { variant: "warning" as const, label: "Low Stock" },
  outOfStock: { variant: "error" as const,   label: "Out of Stock" },
};

const logTypeConfig = {
  sale:         { icon: TrendingDown, color: "text-red-600 bg-red-50",    label: "Sale" },
  purchase:     { icon: TrendingUp,   color: "text-green-600 bg-green-50", label: "Purchase" },
  adjustment:   { icon: SlidersHorizontal, color: "text-blue-600 bg-blue-50", label: "Adjusted" },
  return:       { icon: RefreshCw,    color: "text-purple-600 bg-purple-50", label: "Return" },
  transfer_in:  { icon: TrendingUp,   color: "text-green-600 bg-green-50", label: "Transfer In" },
  transfer_out: { icon: TrendingDown, color: "text-orange-600 bg-orange-50", label: "Transfer Out" },
};

function stockStatus(stock: number, threshold: number): 'inStock' | 'lowStock' | 'outOfStock' {
  if (stock <= 0) return 'outOfStock';
  if (stock <= threshold) return 'lowStock';
  return 'inStock';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return iso; }
}

function AdjustStockModal({ item, onClose, onSave, isLoading }: {
  item: BranchStockItem;
  onClose: () => void;
  onSave: (payload: AdjustStockPayload) => void;
  isLoading?: boolean;
}) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  const calcPreview = (current: number, input: string) => {
    const n = parseInt(input) || 0;
    if (mode === 'add') return current + n;
    if (mode === 'remove') return Math.max(0, current - n);
    return n;
  };

  const totalPreview = calcPreview(item.stock, qty);
  const hasInput = !!qty;

  const handleSave = () => {
    const quantity = parseInt(qty) || 0;
    const payload: AdjustStockPayload = {
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity,
      type: mode === 'add' ? 'increase' : mode === 'remove' ? 'decrease' : 'set',
      reason: note || undefined,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Adjust Stock</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            {(() => {
              const img = item.product?.featured_image || item.product?.images?.[0] || null;
              return img ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={img} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                  <Package size={16} className="text-gray-500" />
                </div>
              );
            })()}
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
              <p className="text-xs text-gray-500">
                {item.variant_label ? `${item.variant_label} · ` : ''}
                Current: <span className="font-bold text-gray-700">{item.stock}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Adjustment Type</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'add', label: 'Add Stock', icon: Plus },
                { value: 'remove', label: 'Remove', icon: Minus },
                { value: 'set', label: 'Set Exact', icon: ArrowUpDown },
              ] as const).map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.value} type="button" onClick={() => setMode(m.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      mode === m.value ? 'border-black bg-black/[0.02]' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Icon size={16} className={mode === m.value ? 'text-black' : 'text-gray-500'} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {mode === 'set' ? 'New Stock Quantity' : 'Quantity'}
            </label>
            <input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
              placeholder={mode === 'set' ? item.stock.toString() : "0"}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
          </div>

          {hasInput && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              totalPreview === 0 ? 'bg-red-50 border border-red-100' :
              totalPreview < item.low_stock_threshold ? 'bg-yellow-50 border border-yellow-100' :
              'bg-green-50 border border-green-100'
            }`}>
              <span className="text-xs font-medium text-gray-600">New stock level</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 line-through">{item.stock}</span>
                <span className="text-sm font-bold text-gray-900">{totalPreview}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason / Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. New supplier delivery, damaged items..."
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" disabled={!hasInput || !note || isLoading}
            onClick={handleSave}>
            <Check size={14} /> {isLoading ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<BranchStockItem | null>(null);
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[] | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotFound, setScanNotFound] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch branches
  const branchesQuery = useQuery({
    queryKey: ['vendor', 'branches'],
    queryFn: () => branchesApi.list(),
  });

  const branches = branchesQuery.data?.data ?? [];
  // Auto-select main branch or first branch
  const effectiveBranchId = useMemo(() => {
    if (selectedBranchId) return selectedBranchId;
    const main = branches.find(b => b.is_main);
    return (main?.id ?? branches[0]?.id) ?? null;
  }, [selectedBranchId, branches]);

  // Fetch stock for selected branch
  const stockQuery = useQuery({
    queryKey: ['vendor', 'branches', effectiveBranchId, 'stock', { search, stockFilter }],
    queryFn: () => branchesApi.stock(effectiveBranchId!, {
      search: search || undefined,
      low_stock: stockFilter === 'low' || stockFilter === 'out' ? true : undefined,
    }),
    enabled: !!effectiveBranchId,
  });

  // Fetch inventory logs
  const logsQuery = useQuery({
    queryKey: ['vendor', 'inventory-logs', { branch_id: effectiveBranchId }],
    queryFn: () => inventoryLogsApi.list({ branch_id: effectiveBranchId || undefined }),
    enabled: activeTab === 'logs' && !!effectiveBranchId,
  });

  const items = stockQuery.data?.data ?? [];
  const logs = logsQuery.data?.data ?? [];

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) => branchesApi.adjustStock(effectiveBranchId!, payload),
    onSuccess: () => {
      setMutationError(null);
      setAdjustItem(null);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'branches', effectiveBranchId, 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'inventory-logs'] });
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to adjust stock')),
  });

  // Filter items by stockFilter on client
  const filtered = items.filter((item) => {
    const st = stockStatus(item.stock, item.low_stock_threshold);
    if (stockFilter === 'low') return st === 'lowStock';
    if (stockFilter === 'out') return st === 'outOfStock';
    return true;
  });

  const alertItems = items.filter(i => {
    const st = stockStatus(i.stock, i.low_stock_threshold);
    return st === 'lowStock' || st === 'outOfStock';
  });

  // Handle barcode scan -- find product/variant and open adjust modal
  const handleBarcodeScan = (barcode: string) => {
    setScanNotFound(null);
    const match = items.find(i => {
      const p = i.product;
      if (p?.barcode === barcode) return true;
      const variant = p?.variants?.find(v => v.barcode === barcode);
      if (variant) return true;
      return false;
    });
    if (match) {
      setAdjustItem(match);
      return;
    }
    setScanNotFound(barcode);
  };

  const toBarcodeItem = (item: BranchStockItem): BarcodeItem => {
    const price = item.product?.price || '0';
    return {
      productName: item.product_name,
      variantName: item.variant_label || undefined,
      price,
      barcode: item.product?.barcode || '',
      sku: item.sku || '',
    };
  };

  const handleExport = async () => {
    if (!effectiveBranchId) return;
    setExporting(true);
    try {
      const all: BranchStockItem[] = [];
      let page = 1;
      while (true) {
        const res = await branchesApi.stock(effectiveBranchId, {
          page,
          per_page: 100,
          search: search || undefined,
          low_stock: stockFilter === 'low' || stockFilter === 'out' ? true : undefined,
        });
        all.push(...(res.data ?? []));
        if (page >= (res.last_page ?? 1)) break;
        page++;
      }
      const header = ['Product', 'SKU', 'Variant', 'Category', 'Stock', 'Alert Threshold', 'Status'];
      const rows = all.map(item => {
        const status = stockStatus(item.stock, item.low_stock_threshold);
        const statusLabel = statusConfigMap[status]?.label ?? status;
        return [
          item.product_name ?? '',
          item.sku ?? '',
          item.variant_label ?? '',
          item.product?.category?.name ?? '',
          String(item.stock),
          String(item.low_stock_threshold),
          statusLabel,
        ];
      });
      const csv = [header, ...rows]
        .map(row => row.map(cell => {
          const str = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wi-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {adjustItem && effectiveBranchId && (
        <AdjustStockModal
          item={adjustItem}
          onClose={() => { setAdjustItem(null); setMutationError(null); }}
          onSave={(p) => adjustMutation.mutate(p)}
          isLoading={adjustMutation.isPending}
        />
      )}
      {barcodeItems && (
        <BarcodeModal items={barcodeItems} onClose={() => setBarcodeItems(null)} />
      )}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
      {scanNotFound && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setScanNotFound(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Barcode Not Found</h3>
            <p className="text-xs text-gray-500 mb-1">No product or variant matches this barcode:</p>
            <p className="text-sm font-mono text-gray-900 bg-gray-100 rounded-lg px-3 py-2 mb-4">{scanNotFound}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setScanNotFound(null)}>Close</Button>
              <Button size="sm" className="flex-1" onClick={() => { setScanNotFound(null); setShowScanner(true); }}>
                Scan Again
              </Button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ProductImportWizard onClose={() => setShowImport(false)} onImport={() => setShowImport(false)} />
      )}

      <PageHeader
        title="Inventory"
        subtitle="Track and manage stock levels across your products"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowScanner(true)}><Barcode size={14} /> Scan Barcode</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Upload size={14} /> Import</Button>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export
            </Button>
            <Button size="sm" onClick={() => alertItems.length > 0 && setAdjustItem(alertItems[0])}>
              <SlidersHorizontal size={14} /> Adjust Stock
            </Button>
          </div>
        }
      />

      {mutationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {mutationError}
        </div>
      )}

      {branches.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500">Branch:</span>
          <div className="w-48">
            <SearchableSelect
              options={branches.map(b => ({ value: String(b.id), label: b.name }))}
              value={effectiveBranchId ? String(effectiveBranchId) : null}
              onChange={(v) => setSelectedBranchId(v ? Number(v) : null)}
              placeholder="Select branch"
              size="sm"
              searchable={false}
            />
          </div>
        </div>
      )}

      {branchesQuery.isLoading && (
        <div className="py-10 text-center text-sm text-gray-400">Loading branches...</div>
      )}

      {!branchesQuery.isLoading && branches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-6 text-center">
          <p className="text-sm text-yellow-800">No branches found. Create a branch first to manage inventory.</p>
        </div>
      )}

      {/* Alert banner */}
      {alertItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-yellow-900">
              {alertItems.filter(i => stockStatus(i.stock, i.low_stock_threshold) === 'outOfStock').length} out of stock,{' '}
              {alertItems.filter(i => stockStatus(i.stock, i.low_stock_threshold) === 'lowStock').length} low stock
            </p>
            <p className="text-xs text-yellow-700">Restock soon to avoid missing orders.</p>
          </div>
          <button onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
            className="ml-auto text-xs text-yellow-800 font-medium hover:underline whitespace-nowrap">
            View affected →
          </button>
        </div>
      )}

      {/* Stats — use aggregate counts from the API so the summary reflects the
          full branch inventory, not just the current page. */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(() => {
          const apiCounts = (stockQuery.data as unknown as { counts?: { in_stock?: number; low_stock?: number; out_of_stock?: number } } | undefined)?.counts;
          const inStockCount  = apiCounts?.in_stock      ?? items.filter(i => stockStatus(i.stock, i.low_stock_threshold) === 'inStock').length;
          const lowStockCount = apiCounts?.low_stock     ?? items.filter(i => stockStatus(i.stock, i.low_stock_threshold) === 'lowStock').length;
          const outStockCount = apiCounts?.out_of_stock  ?? items.filter(i => stockStatus(i.stock, i.low_stock_threshold) === 'outOfStock').length;
          return [
            { label: "In Stock",     count: inStockCount,  color: "text-green-700",  bg: "bg-green-50",  key: 'all' as const },
            { label: "Low Stock",    count: lowStockCount, color: "text-yellow-700", bg: "bg-yellow-50", key: 'low' as const },
            { label: "Out of Stock", count: outStockCount, color: "text-red-700",    bg: "bg-red-50",    key: 'out' as const },
          ];
        })().map(s => (
          <button key={s.label} onClick={() => setStockFilter(stockFilter === s.key ? 'all' : s.key)}
            className={`text-left p-4 rounded-xl border-2 bg-white transition-all ${
              stockFilter === s.key ? 'border-gray-900' : 'border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
            }`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
        <button onClick={() => setActiveTab('stock')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'stock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Stock Levels
        </button>
        <button onClick={() => setActiveTab('logs')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <History size={12} /> Movement Log
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by product name or SKU…"
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            {stockQuery.error && (
              <div className="bg-red-50 border-b border-red-100 text-red-700 text-sm px-4 py-3">
                {getApiErrorMessage(stockQuery.error, 'Failed to load inventory')}
              </div>
            )}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product / Variant</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Threshold</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockQuery.isLoading && (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">Loading inventory...</td></tr>
                  )}
                  {!stockQuery.isLoading && filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">No items in stock.</td></tr>
                  )}
                  {!stockQuery.isLoading && filtered.map((item) => {
                    const st = stockStatus(item.stock, item.low_stock_threshold);
                    const statusCfg = statusConfigMap[st];
                    const rowKey = `${item.product_id}-${item.variant_id ?? 'p'}`;
                    const img = item.product?.featured_image || item.product?.images?.[0] || null;
                    return (
                      <tr key={rowKey} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {img ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={img} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <Package size={14} className="text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                              {item.variant_label && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.variant_label}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-500">{item.sku || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${
                            st === 'outOfStock' ? 'text-red-600' :
                            st === 'lowStock' ? 'text-yellow-600' : 'text-gray-900'
                          }`}>{item.stock}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{item.low_stock_threshold}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {item.product?.barcode && (
                              <button type="button" onClick={() => setBarcodeItems([toBarcodeItem(item)])}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                title="Download barcode">
                                <Download size={12} />
                              </button>
                            )}
                            <button onClick={() => setAdjustItem(item)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                              <SlidersHorizontal size={11} /> Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (Stock Levels) */}
            <div className="md:hidden p-3">
              {stockQuery.isLoading && (
                <div className="px-4 py-12 text-center text-sm text-gray-400">Loading inventory...</div>
              )}
              {!stockQuery.isLoading && filtered.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-gray-400">No items in stock.</div>
              )}
              {!stockQuery.isLoading && filtered.length > 0 && (
                <div className="space-y-2">
                  {filtered.map(item => {
                    const st = stockStatus(item.stock, item.low_stock_threshold);
                    const statusCfg = statusConfigMap[st];
                    const rowKey = `${item.product_id}-${item.variant_id ?? 'p'}`;
                    const img = item.product?.featured_image || item.product?.images?.[0] || null;
                    return (
                      <MobileRowCard
                        key={rowKey}
                        header={
                          <div className="flex items-center gap-2.5">
                            {img ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={img} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <Package size={14} className="text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                              {item.variant_label && (
                                <p className="text-[11px] text-gray-500 truncate">{item.variant_label}</p>
                              )}
                            </div>
                          </div>
                        }
                        trailing={
                          <div className="text-right">
                            <p className={`text-base font-bold ${
                              st === 'outOfStock' ? 'text-red-600' :
                              st === 'lowStock' ? 'text-yellow-600' : 'text-gray-900'
                            }`}>{item.stock}</p>
                            <p className="text-[10px] text-gray-400 -mt-0.5">in stock</p>
                          </div>
                        }
                        meta={
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                            <span className="text-[11px] font-mono text-gray-500">SKU: {item.sku || '—'}</span>
                          </div>
                        }
                        actions={
                          <>
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => setAdjustItem(item)}
                            >
                              <SlidersHorizontal size={11} /> Adjust
                            </Button>
                            {item.product?.barcode && (
                              <button
                                type="button"
                                onClick={() => setBarcodeItems([toBarcodeItem(item)])}
                                aria-label="Download barcode"
                                className="h-7 w-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                              >
                                <Download size={12} />
                              </button>
                            )}
                          </>
                        }
                        details={
                          <div className="flex justify-between">
                            <span className="text-gray-500">Low-stock threshold</span>
                            <span className="text-gray-900">{item.low_stock_threshold}</span>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Stock Movement History</p>
            <Button variant="secondary" size="sm"><Filter size={13} /> Filter</Button>
          </div>
          {logsQuery.error && (
            <div className="bg-red-50 border-b border-red-100 text-red-700 text-sm px-4 py-3">
              {getApiErrorMessage(logsQuery.error, 'Failed to load logs')}
            </div>
          )}
          <div className="hidden md:block overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Change</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Before → After</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Note</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsQuery.isLoading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">Loading logs...</td></tr>
                )}
                {!logsQuery.isLoading && logs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">No movement logs yet.</td></tr>
                )}
                {!logsQuery.isLoading && logs.map((log: InventoryLog) => {
                  const cfg = logTypeConfig[log.type] || logTypeConfig.adjustment;
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">Product #{log.product_id}{log.variant_id ? ` / V${log.variant_id}` : ''}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
                          <Icon size={10} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {log.quantity_before} → <span className="font-semibold text-gray-900">{log.quantity_after}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{log.reason || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (Movement Log) */}
          <div className="md:hidden p-3">
            {logsQuery.isLoading && (
              <div className="px-4 py-10 text-center text-xs text-gray-400">Loading logs...</div>
            )}
            {!logsQuery.isLoading && logs.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-gray-400">No movement logs yet.</div>
            )}
            {!logsQuery.isLoading && logs.length > 0 && (
              <div className="space-y-2">
                {logs.map((log: InventoryLog) => {
                  const cfg = logTypeConfig[log.type] || logTypeConfig.adjustment;
                  const Icon = cfg.icon;
                  return (
                    <MobileRowCard
                      key={log.id}
                      header={
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            Product #{log.product_id}{log.variant_id ? ` / V${log.variant_id}` : ''}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
                            <Icon size={10} /> {cfg.label}
                          </span>
                        </div>
                      }
                      trailing={
                        <span className={`text-base font-bold ${log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                        </span>
                      }
                      meta={
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {log.quantity_before} → <span className="font-semibold text-gray-900">{log.quantity_after}</span>
                          </span>
                          <span className="text-gray-400">{formatDate(log.created_at)}</span>
                        </div>
                      }
                      details={
                        log.reason ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Note</p>
                            <p className="text-sm text-gray-700">{log.reason}</p>
                          </div>
                        ) : null
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
