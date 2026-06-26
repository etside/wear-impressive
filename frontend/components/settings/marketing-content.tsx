'use client';
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Plus, Mail, MessageSquare, Send, X, Tag, ShoppingBag,
  Search, Trash2, Pencil, MoreHorizontal, Eye, Package,
} from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { catalogsApi, type Catalog as ApiCatalog } from "@/lib/api/services/vendor-marketing";
import { getApiErrorMessage } from "@/lib/api/client";

/* ── Campaigns data ───────────────────────────────────────────────── */
const campaigns = [
  { id: 1, name: "Eid Sale Announcement", type: "Email", sent: 1240, opened: 380, clicks: 92, status: "sent" },
  { id: 2, name: "Flash Sale Alert", type: "SMS", sent: 850, opened: 650, clicks: 210, status: "sent" },
  { id: 3, name: "New Collection Launch", type: "WhatsApp", sent: 430, opened: 310, clicks: 88, status: "active" },
];

const typeIcons: Record<string, React.ReactNode> = {
  Email: <Mail size={13} />, SMS: <MessageSquare size={13} />, WhatsApp: <Send size={13} />,
};

const statusVariants: Record<string, "default" | "success" | "info" | "warning"> = {
  sent: "success", active: "info", draft: "default", scheduled: "warning",
};

/* ── Catalog types ────────────────────────────────────────────────── */
interface CatalogProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  comparePrice: number;
  included: boolean;
}

interface Catalog {
  id: number;
  title: string;
  status: 'Active' | 'Draft';
  market: string;
  currency: string;
  adjustType: 'decrease' | 'increase';
  adjustPercent: number;
  includeComparePrice: boolean;
  autoInclude: boolean;
  productCount: number;
}

const MOCK_CATALOGS: Catalog[] = [
  { id: 1, title: 'Wholesale Pricing', status: 'Active', market: 'B2B Wholesale', currency: 'BDT', adjustType: 'decrease', adjustPercent: 20, includeComparePrice: true, autoInclude: true, productCount: 45 },
  { id: 2, title: 'VIP Members', status: 'Active', market: 'VIP Customers', currency: 'BDT', adjustType: 'decrease', adjustPercent: 10, includeComparePrice: true, autoInclude: false, productCount: 120 },
  { id: 3, title: 'Staff Discount', status: 'Draft', market: 'Internal', currency: 'BDT', adjustType: 'decrease', adjustPercent: 30, includeComparePrice: false, autoInclude: false, productCount: 0 },
];

const MOCK_PRODUCTS: CatalogProduct[] = [
  { id: 'p1', name: 'Muslin Saree Red', image: '', price: 2500, comparePrice: 3000, included: true },
  { id: 'p2', name: 'Cotton Panjabi', image: '', price: 800, comparePrice: 1000, included: true },
  { id: 'p3', name: 'Printed T-Shirt', image: '', price: 400, comparePrice: 500, included: true },
  { id: 'p4', name: 'Organic Honey 500g', image: '', price: 450, comparePrice: 0, included: false },
  { id: 'p5', name: 'Leather Wallet', image: '', price: 1200, comparePrice: 1500, included: true },
];

const CURRENCIES = [
  { value: 'BDT', label: 'Store currency (BDT ৳)' },
  { value: 'USD', label: 'USD $' },
  { value: 'EUR', label: 'EUR €' },
];

/* ── Main Component ───────────────────────────────────────────────── */
export function MarketingContent() {
  const { t } = useLang();
  const d = t.dashMarketing;
  const [mainTab, setMainTab] = useState<'campaigns' | 'catalogs'>('campaigns');
  const [campaignTab, setCampaignTab] = useState(0);

  // ── Catalogs state (wired to backend) ──
  const qc = useQueryClient();
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editCatalog, setEditCatalog] = useState<Catalog | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [catalogBanner, setCatalogBanner] = useState<string | null>(null);

  const catalogsQuery = useQuery({
    queryKey: ['vendor', 'catalogs', { search: catalogSearch }],
    queryFn: () => catalogsApi.list({ search: catalogSearch || undefined, per_page: 100 }),
  });

  const catalogs: Catalog[] = useMemo(() => {
    const rows = catalogsQuery.data?.data ?? [];
    return rows.map((c: ApiCatalog): Catalog => ({
      id: c.id,
      title: c.name,
      status: c.status === 'active' ? 'Active' : 'Draft',
      market: c.market_id ? `Market #${c.market_id}` : '—',
      currency: 'BDT',
      adjustType: (c.price_adjustment_type ?? 'decrease') as 'decrease' | 'increase',
      adjustPercent: parseFloat(c.price_adjustment_percent ?? '0') || 0,
      includeComparePrice: c.include_compare_price,
      autoInclude: c.auto_include_new,
      productCount: c.overrides_count ?? 0,
    }));
  }, [catalogsQuery.data]);

  const createCatalogMut = useMutation({
    mutationFn: (data: Catalog) => catalogsApi.create({
      name: data.title,
      status: data.status === 'Active' ? 'active' : 'draft',
      price_adjustment_type: data.adjustType,
      price_adjustment_percent: data.adjustPercent,
      include_compare_price: data.includeComparePrice,
      auto_include_new: data.autoInclude,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'catalogs'] });
      setShowCatalogModal(false);
    },
    onError: (err) => setCatalogBanner(getApiErrorMessage(err, 'Failed to create catalog.')),
  });

  const updateCatalogMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Catalog }) => catalogsApi.update(id, {
      name: data.title,
      status: data.status === 'Active' ? 'active' : 'draft',
      price_adjustment_type: data.adjustType,
      price_adjustment_percent: data.adjustPercent,
      include_compare_price: data.includeComparePrice,
      auto_include_new: data.autoInclude,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'catalogs'] });
      setShowCatalogModal(false);
    },
    onError: (err) => setCatalogBanner(getApiErrorMessage(err, 'Failed to update catalog.')),
  });

  const deleteCatalogMut = useMutation({
    mutationFn: (id: number) => catalogsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor', 'catalogs'] }),
    onError: (err) => setCatalogBanner(getApiErrorMessage(err, 'Failed to delete catalog.')),
  });

  // ── Catalog form state ──
  const [cfTitle, setCfTitle] = useState('');
  const [cfStatus, setCfStatus] = useState<string | null>('Active');
  const [cfMarket, setCfMarket] = useState('');
  const [cfCurrency, setCfCurrency] = useState<string | null>('BDT');
  const [cfAdjustType, setCfAdjustType] = useState<string | null>('decrease');
  const [cfAdjustPercent, setCfAdjustPercent] = useState('0');
  const [cfComparePrice, setCfComparePrice] = useState(true);
  const [cfAutoInclude, setCfAutoInclude] = useState(true);
  const [cfProducts, setCfProducts] = useState<CatalogProduct[]>(MOCK_PRODUCTS);
  const [cfProductTab, setCfProductTab] = useState<'included' | 'excluded' | 'all'>('included');

  const openCreateCatalog = () => {
    setEditCatalog(null);
    setCfTitle(''); setCfStatus('Active'); setCfMarket(''); setCfCurrency('BDT');
    setCfAdjustType('decrease'); setCfAdjustPercent('0'); setCfComparePrice(true);
    setCfAutoInclude(true); setCfProducts(MOCK_PRODUCTS);
    setShowCatalogModal(true);
  };

  const openEditCatalog = (c: Catalog) => {
    setEditCatalog(c);
    setCfTitle(c.title); setCfStatus(c.status); setCfMarket(c.market); setCfCurrency(c.currency);
    setCfAdjustType(c.adjustType); setCfAdjustPercent(String(c.adjustPercent));
    setCfComparePrice(c.includeComparePrice); setCfAutoInclude(c.autoInclude);
    setCfProducts(MOCK_PRODUCTS);
    setShowCatalogModal(true);
    setActionMenu(null);
  };

  const saveCatalog = () => {
    setCatalogBanner(null);
    const data: Catalog = {
      id: editCatalog?.id || 0,
      title: cfTitle, status: cfStatus as 'Active' | 'Draft', market: cfMarket,
      currency: cfCurrency || 'BDT', adjustType: cfAdjustType as 'decrease' | 'increase',
      adjustPercent: parseFloat(cfAdjustPercent) || 0, includeComparePrice: cfComparePrice,
      autoInclude: cfAutoInclude, productCount: cfProducts.filter(p => p.included).length,
    };
    if (editCatalog) {
      updateCatalogMut.mutate({ id: editCatalog.id, data });
    } else {
      createCatalogMut.mutate(data);
    }
  };

  const deleteCatalog = (id: number) => {
    deleteCatalogMut.mutate(id);
    setActionMenu(null);
  };

  const filteredCampaigns = campaignTab === 0 ? campaigns : campaigns.filter(c => c.type === d.tabs[campaignTab]);
  const filteredCatalogs = catalogs.filter(c => !catalogSearch || c.title.toLowerCase().includes(catalogSearch.toLowerCase()));

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none';

  const filteredCfProducts = cfProductTab === 'all' ? cfProducts
    : cfProductTab === 'included' ? cfProducts.filter(p => p.included)
    : cfProducts.filter(p => !p.included);

  return (
    <div className="space-y-6">
      {/* Main tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setMainTab('campaigns')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Campaigns
          </button>
          <button onClick={() => setMainTab('catalogs')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === 'catalogs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Catalogs
          </button>
        </div>
        {mainTab === 'campaigns' && (
          <Button size="sm"><Plus size={14} /> {d.create}</Button>
        )}
        {mainTab === 'catalogs' && (
          <Button size="sm" onClick={openCreateCatalog}><Plus size={14} /> Create catalog</Button>
        )}
      </div>

      {/* ── Campaigns tab ─────────────────────────────────── */}
      {mainTab === 'campaigns' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Sent", value: "2,520" },
              { label: "Total Opens", value: "1,340" },
              { label: "Total Clicks", value: "390" },
              { label: "Avg Open Rate", value: "53%" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign type tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {d.tabs.map((tab, i) => (
              <button key={tab} onClick={() => setCampaignTab(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${i === campaignTab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            {filteredCampaigns.length > 0 ? (
              <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.name}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.type}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.sent}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.opened}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.clicks}</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{d.columns.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600">{typeIcons[c.type]} <span className="text-xs">{c.type}</span></div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{c.sent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{c.opened.toLocaleString()} <span className="text-xs text-gray-400">({Math.round(c.opened / c.sent * 100)}%)</span></td>
                        <td className="px-4 py-3 text-right text-gray-700">{c.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center"><Badge variant={statusVariants[c.status]}>{c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-2">
                {filteredCampaigns.map(c => (
                  <MobileRowCard
                    key={c.id}
                    header={
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-gray-700 text-sm font-medium">
                          {typeIcons[c.type]} {c.name}
                        </span>
                        <Badge variant={statusVariants[c.status]}>{c.status}</Badge>
                      </div>
                    }
                    trailing={
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{c.sent.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 -mt-0.5">sent</p>
                      </div>
                    }
                    meta={
                      <span className="text-gray-600">
                        {c.opened.toLocaleString()} opens ({Math.round(c.opened / c.sent * 100)}%) · {c.clicks.toLocaleString()} clicks
                      </span>
                    }
                  />
                ))}
              </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <Mail size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{d.empty}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Catalogs tab ──────────────────────────────────── */}
      {mainTab === 'catalogs' && (
        <>
          {catalogs.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-xl border border-gray-200 py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Tag size={28} className="text-gray-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Personalize buying with catalogs</h2>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Create custom product and pricing offerings for your customers with catalogs.
              </p>
              <Button size="sm" onClick={openCreateCatalog}>Create catalog</Button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-sm">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Search catalogs..." className="w-full text-sm outline-none bg-transparent" />
                </div>
              </div>

              {/* Catalog list */}
              <div className="bg-white rounded-xl border border-gray-200">
                {/* Desktop table */}
                <div className="hidden md:block overflow-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Catalog</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Market</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Adjustment</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500">Products</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalogs.map(c => (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => openEditCatalog(c)} className="font-medium text-gray-900 hover:underline">{c.title}</button>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{c.market || '--'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.adjustType === 'decrease' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                              {c.adjustType === 'decrease' ? '-' : '+'}{c.adjustPercent}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{c.productCount}</td>
                          <td className="px-4 py-3">
                            <Badge variant={c.status === 'Active' ? 'success' : 'default'}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative inline-block">
                              <button onClick={() => setActionMenu(actionMenu === c.id ? null : c.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                <MoreHorizontal size={16} />
                              </button>
                              {actionMenu === c.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                                  <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                    <button onClick={() => openEditCatalog(c)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                      <Pencil size={14} /> Edit
                                    </button>
                                    <button onClick={() => deleteCatalog(c.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-3 space-y-2">
                  {filteredCatalogs.map(c => (
                    <MobileRowCard
                      key={c.id}
                      header={
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => openEditCatalog(c)}
                            className="font-medium text-gray-900 text-sm hover:underline text-left"
                          >
                            {c.title}
                          </button>
                          <Badge variant={c.status === 'Active' ? 'success' : 'default'}>{c.status}</Badge>
                        </div>
                      }
                      trailing={
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-900">{c.productCount}</p>
                          <p className="text-[10px] text-gray-400 -mt-0.5">products</p>
                        </div>
                      }
                      meta={
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="text-gray-600">{c.market || '—'}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.adjustType === 'decrease' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            {c.adjustType === 'decrease' ? '-' : '+'}{c.adjustPercent}%
                          </span>
                        </div>
                      }
                      actions={
                        <>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => openEditCatalog(c)}
                          >
                            <Pencil size={11} /> Edit
                          </Button>
                          <button
                            onClick={() => deleteCatalog(c.id)}
                            aria-label="Delete catalog"
                            className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Create/Edit Catalog Modal ─────────────────────── */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">
                {editCatalog ? 'Edit catalog' : 'New catalog'}
              </h2>
              <button onClick={() => setShowCatalogModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title + Status */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <div className="relative">
                      <input value={cfTitle} onChange={e => { if (e.target.value.length <= 255) setCfTitle(e.target.value); }}
                        placeholder="e.g. Wholesale Pricing" className={inputCls} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{cfTitle.length}/255</span>
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <SearchableSelect
                      options={[{ value: 'Active', label: 'Active' }, { value: 'Draft', label: 'Draft' }]}
                      value={cfStatus} onChange={setCfStatus} searchable={false}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Market / Customer group</label>
                  <input value={cfMarket} onChange={e => setCfMarket(e.target.value)}
                    placeholder="e.g. B2B Wholesale, VIP Members" className={inputCls} />
                  <p className="text-[11px] text-gray-400 mt-1">Assign this catalog to a specific customer segment</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-700">Set prices in</span>
                  <div className="w-48">
                    <SearchableSelect options={CURRENCIES} value={cfCurrency} onChange={setCfCurrency} searchable={false} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-700 shrink-0">Price adjustment</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">-</span>
                    <input type="number" min={0} max={100} value={cfAdjustPercent}
                      onChange={e => setCfAdjustPercent(e.target.value)}
                      className="w-16 px-2 py-1.5 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none" />
                    <span className="text-gray-500">%</span>
                    <div className="w-32">
                      <SearchableSelect
                        options={[{ value: 'decrease', label: 'Decrease' }, { value: 'increase', label: 'Increase' }]}
                        value={cfAdjustType} onChange={setCfAdjustType} searchable={false}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <ToggleSwitch checked={cfComparePrice} onChange={setCfComparePrice} />
                    <span className="text-sm text-gray-700">Include compare-at price</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  {cfAdjustType === 'decrease' ? 'Prices will be reduced' : 'Prices will be increased'} by {cfAdjustPercent || 0}% for customers in this catalog.
                  {cfComparePrice ? ' Original price will be shown as crossed out.' : ''}
                </p>
              </div>

              {/* Products */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Products</h3>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <ToggleSwitch checked={cfAutoInclude} onChange={setCfAutoInclude} />
                  <span className="text-sm text-gray-700">Automatically include new products</span>
                </div>

                {/* Product tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
                  {(['included', 'excluded', 'all'] as const).map(tab => (
                    <button key={tab} onClick={() => setCfProductTab(tab)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${cfProductTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Product table */}
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-3 py-2 font-medium text-gray-500">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Price ({cfCurrency || 'BDT'})</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-500">Compare at</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-500 w-16">Include</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCfProducts.map(p => {
                        const adj = parseFloat(cfAdjustPercent) || 0;
                        const adjPrice = cfAdjustType === 'decrease'
                          ? p.price * (1 - adj / 100)
                          : p.price * (1 + adj / 100);
                        return (
                          <tr key={p.id} className="border-b border-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                  <Package size={14} className="text-gray-400" />
                                </div>
                                <span className="text-gray-900">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min={0} step={0.01} defaultValue={Math.round(adjPrice)}
                                className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none" />
                            </td>
                            <td className="px-3 py-2 text-right">
                              {cfComparePrice ? (
                                <input type="number" min={0} step={0.01} defaultValue={p.price}
                                  className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none" />
                              ) : (
                                <span className="text-gray-400">--</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input type="checkbox" checked={p.included}
                                onChange={() => setCfProducts(prev => prev.map(pp => pp.id === p.id ? { ...pp, included: !pp.included } : pp))}
                                className="accent-black w-4 h-4" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setShowCatalogModal(false)}>Cancel</Button>
              <Button size="sm" onClick={saveCatalog} disabled={!cfTitle.trim()}>
                {editCatalog ? 'Save changes' : 'Create catalog'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
