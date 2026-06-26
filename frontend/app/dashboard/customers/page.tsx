'use client';
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Search, Download, Eye, Plus, X, Users, Filter, Pencil, Trash2,
  MoreHorizontal, ShoppingCart, MapPin, Calendar, DollarSign, Tag,
  Mail, MessageSquare, Upload, Loader2,
} from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { customersApi, segmentsApi } from "@/lib/api/services/vendor-customers";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Customer, CustomerSegment } from "@/lib/api/types";
import { SegmentBuilderModal } from "@/components/dashboard/segment-builder-modal";
import { SegmentBroadcastModal } from "@/components/dashboard/segment-broadcast-modal";
import { CustomerImportWizard } from "@/components/dashboard/customer-import-wizard";
import type { CustomerImportRow } from "@/components/dashboard/customer-import-wizard";

interface SegmentCondition {
  field: string;
  operator: string;
  value: string | Record<string, unknown>;
}

const CONDITION_FIELDS = [
  { value: 'total_spent', label: 'Total spent' },
  { value: 'order_count', label: 'Number of orders' },
  { value: 'last_order', label: 'Last order date' },
  { value: 'location_district', label: 'District' },
  { value: 'location_division', label: 'Division' },
  { value: 'joined_date', label: 'Customer since' },
  { value: 'email_subscribed', label: 'Email subscribed' },
  { value: 'tags', label: 'Customer tags' },
  { value: 'product_purchased', label: 'Has purchased product' },
  { value: 'category_purchased', label: 'Has purchased from category' },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  total_spent: [
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'equals', label: 'equals' },
    { value: 'between', label: 'is between' },
  ],
  order_count: [
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'equals', label: 'equals' },
  ],
  last_order: [
    { value: 'within_days', label: 'within last (days)' },
    { value: 'more_than_days', label: 'more than (days) ago' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
  ],
  location_district: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ],
  location_division: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ],
  joined_date: [
    { value: 'within_days', label: 'within last (days)' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
  ],
  email_subscribed: [
    { value: 'is', label: 'is' },
  ],
  tags: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
  ],
  product_purchased: [
    { value: 'is', label: 'is' },
  ],
  category_purchased: [
    { value: 'is', label: 'is' },
  ],
};

function formatJoinedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return iso; }
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function CustomersPage() {
  const { t } = useLang();
  const d = t.dashCustomers;
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<'customers' | 'segments'>('customers');
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string | null>('all');

  // ── Customer queries ──
  const customersQuery = useQuery({
    queryKey: ['vendor', 'customers', { search, segment_id: segmentFilter }],
    queryFn: () => customersApi.list({
      search: search || undefined,
      segment_id: segmentFilter && segmentFilter !== 'all' ? Number(segmentFilter) : undefined,
    }),
  });

  const segmentsQuery = useQuery({
    queryKey: ['vendor', 'segments'],
    queryFn: () => segmentsApi.list(),
  });

  const customers = customersQuery.data?.data ?? [];
  const segments = segmentsQuery.data?.data ?? [];

  // ── Import wizard state ──
  const [showImport, setShowImport] = useState(false);

  // ── Segment modal state ──
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [editSegment, setEditSegment] = useState<CustomerSegment | null>(null);
  const [segmentSearch, setSegmentSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const invalidateSegments = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'segments'] });

  const deleteSegmentMutation = useMutation({
    mutationFn: (id: number) => segmentsApi.delete(id),
    onSuccess: () => { setActionMenu(null); invalidateSegments(); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to delete segment')),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'customers'] });
    },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to delete customer')),
  });

  const openCreateSegment = () => {
    setEditSegment(null);
    setMutationError(null);
    setShowSegmentModal(true);
  };

  const openEditSegment = (s: CustomerSegment) => {
    setEditSegment(s);
    setMutationError(null);
    setShowSegmentModal(true);
    setActionMenu(null);
  };

  /* ── Broadcast + CSV export ── */
  const [broadcastFor, setBroadcastFor] = useState<{ segment: CustomerSegment; channel: 'email' | 'sms' } | null>(null);

  const exportSegmentCsv = async (s: CustomerSegment) => {
    setActionMenu(null);
    try {
      const members: Array<{ id: number; name: string; email: string; phone: string | null; total_spent: string | null; total_orders: number; last_order_at: string | null }> = [];
      let page = 1;
      while (true) {
        const res = await segmentsApi.customers(s.id, { page, per_page: 100 });
        members.push(...(res.data as typeof members));
        if (page >= res.last_page) break;
        page++;
      }
      const rows = [
        ['Name', 'Email', 'Phone', 'Total Spent', 'Total Orders', 'Last Order'],
        ...members.map(m => [
          m.name ?? '',
          m.email ?? '',
          m.phone ?? '',
          m.total_spent ?? '0',
          String(m.total_orders ?? 0),
          m.last_order_at ?? '',
        ]),
      ];
      const csv = rows
        .map(row => row.map(cell => {
          const str = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `segment-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMutationError(getApiErrorMessage(err, 'Failed to export segment'));
    }
  };

  const startBroadcast = (s: CustomerSegment, channel: 'email' | 'sms') => {
    setActionMenu(null);
    setBroadcastFor({ segment: s, channel });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: Customer[] = [];
      let page = 1;
      const params: Record<string, unknown> = { page, per_page: 100 };
      if (search) params.search = search;
      if (segmentFilter && segmentFilter !== 'all') params.segment_id = Number(segmentFilter);
      while (true) {
        const res = await customersApi.list(params as any);
        all.push(...(res.data ?? []));
        if (page >= (res.last_page ?? 1)) break;
        page++;
        (params as any).page = page;
      }
      const header = ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order', 'Joined'];
      const rows = all.map(c => [
        c.name ?? '',
        c.email ?? '',
        c.phone ?? '',
        String(c.total_orders ?? 0),
        c.total_spent ?? '0',
        c.last_order_at ?? '',
        formatJoinedDate(c.created_at),
      ]);
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
      a.download = `wi-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const filteredSegments = segments.filter(s => !segmentSearch || s.name.toLowerCase().includes(segmentSearch.toLowerCase()));

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-gray-300 outline-none';

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {mainTab === 'customers' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                  <Upload size={14} /> {d.import}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {d.export}
                </Button>
              </>
            )}
            {mainTab === 'segments' && (
              <Button size="sm" onClick={openCreateSegment}><Plus size={14} /> Create segment</Button>
            )}
          </div>
        }
      />

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
        <button onClick={() => setMainTab('customers')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          All Customers
        </button>
        <button onClick={() => setMainTab('segments')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === 'segments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Segments
        </button>
      </div>

      {mutationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {mutationError}
        </div>
      )}

      {/* ── Customers tab ─────────────────────────────────── */}
      {mainTab === 'customers' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={d.searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white" />
            </div>
            <div className="w-44">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'All segments' },
                  ...segments.map(s => ({ value: String(s.id), label: s.name })),
                ]}
                value={segmentFilter} onChange={setSegmentFilter} placeholder="Segment" size="sm" searchable={false}
              />
            </div>
          </div>

          {customersQuery.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {getApiErrorMessage(customersQuery.error, 'Failed to load customers')}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl">
            {/* Desktop table */}
            <div className="hidden md:block overflow-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.name}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.phone}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{d.columns.orders}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.columns.spent}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tags</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.columns.joined}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customersQuery.isLoading && (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">Loading customers...</td></tr>
                  )}
                  {!customersQuery.isLoading && customers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">No customers found.</td></tr>
                  )}
                  {!customersQuery.isLoading && customers.map((customer: Customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{customer.name}</span>
                            {customer.email && (
                              <span className="block text-[11px] text-gray-400">{customer.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{customer.phone || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{customer.total_orders}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">&#2547;{parseFloat(customer.total_spent || '0').toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {customer.tags && customer.tags.length > 0 ? customer.tags.slice(0, 2).map(s => (
                            <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{s}</span>
                          )) : <span className="text-[10px] text-gray-400">--</span>}
                          {customer.tags && customer.tags.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{customer.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatJoinedDate(customer.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/customers/${customer.id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Delete customer "${customer.name}"?`)) {
                                deleteCustomerMutation.mutate(customer.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3">
              {customersQuery.isLoading && (
                <div className="px-4 py-12 text-center text-sm text-gray-400">Loading customers...</div>
              )}
              {!customersQuery.isLoading && customers.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-gray-400">No customers found.</div>
              )}
              {!customersQuery.isLoading && customers.length > 0 && (
                <div className="space-y-2">
                  {customers.map((customer: Customer) => (
                    <MobileRowCard
                      key={customer.id}
                      header={
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{customer.name}</p>
                            {customer.email && (
                              <p className="text-[11px] text-gray-400 truncate">{customer.email}</p>
                            )}
                          </div>
                        </div>
                      }
                      trailing={
                        <span className="font-semibold text-gray-900 text-sm">৳{parseFloat(customer.total_spent || '0').toLocaleString()}</span>
                      }
                      meta={
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-700">{customer.phone || 'No phone'}</span>
                          <span className="text-gray-500">{customer.total_orders} order{customer.total_orders === 1 ? '' : 's'} · joined {formatJoinedDate(customer.created_at)}</span>
                        </div>
                      }
                      actions={
                        <>
                          <Link href={`/dashboard/customers/${customer.id}`} className="flex-1">
                            <Button variant="secondary" size="xs" className="w-full justify-center">
                              <Eye size={12} /> View
                            </Button>
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Delete customer "${customer.name}"?`)) {
                                deleteCustomerMutation.mutate(customer.id);
                              }
                            }}
                            aria-label="Delete customer"
                            className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      }
                      details={
                        customer.tags && customer.tags.length > 0 ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.map(s => (
                                <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{s}</span>
                              ))}
                            </div>
                          </div>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {customers.length} of {customersQuery.data?.total ?? 0} customers
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Segments tab ──────────────────────────────────── */}
      {mainTab === 'segments' && (
        <>
          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-sm">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input type="text" value={segmentSearch} onChange={e => setSegmentSearch(e.target.value)}
                placeholder="Search segments..." className="w-full text-sm outline-none bg-transparent" />
            </div>
            <span className="text-xs text-gray-400 ml-auto">{segments.length} segments</span>
          </div>

          {segmentsQuery.isLoading && (
            <div className="py-16 text-center text-sm text-gray-400">Loading segments...</div>
          )}

          {segmentsQuery.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {getApiErrorMessage(segmentsQuery.error, 'Failed to load segments')}
            </div>
          )}

          {/* Segments grid */}
          {!segmentsQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSegments.map(s => {
                const rules = Array.isArray((s.conditions as any).rules) ? (s.conditions as any).rules as SegmentCondition[] : [];
                return (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                          <Users size={14} className="text-blue-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{s.name}</h4>
                        </div>
                      </div>
                      <div className="relative">
                        <button onClick={() => setActionMenu(actionMenu === s.id ? null : s.id)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400">
                          <MoreHorizontal size={14} />
                        </button>
                        {actionMenu === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                              <button onClick={() => startBroadcast(s, 'email')}
                                disabled={s.customer_count === 0}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Mail size={12} /> Send email
                              </button>
                              <button onClick={() => startBroadcast(s, 'sms')}
                                disabled={s.customer_count === 0}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <MessageSquare size={12} /> Send SMS
                              </button>
                              <button onClick={() => exportSegmentCsv(s)}
                                disabled={s.customer_count === 0}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Download size={12} /> Export CSV
                              </button>
                              <div className="h-px bg-gray-100 my-1" />
                              <button onClick={() => openEditSegment(s)}
                                disabled={s.is_system}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Pencil size={12} /> Edit
                              </button>
                              <button onClick={() => { setActionMenu(null); deleteSegmentMutation.mutate(s.id); }}
                                disabled={s.is_system}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{s.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{s.customer_count} customers</span>
                      <span className="text-[10px] text-gray-400">{formatJoinedDate(s.created_at)}</span>
                    </div>
                    {/* Conditions preview */}
                    {rules.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {rules.map((c, i) => {
                            const fieldLabel = CONDITION_FIELDS.find(f => f.value === c.field)?.label || c.field;
                            const opLabel = (OPERATORS[c.field] || []).find(o => o.value === c.operator)?.label || c.operator;
                            const displayValue = typeof c.value === 'object' && c.value !== null
                              ? ((c.value as {option_label?: string; option_value?: string}).option_label
                                  ? `${(c.value as {option_label: string; option_value: string}).option_label}: ${(c.value as {option_label: string; option_value: string}).option_value}`
                                  : Object.values(c.value as Record<string, unknown>).filter(Boolean).join(', '))
                              : String(c.value ?? '');
                            return (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {fieldLabel} {opLabel} {displayValue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Customer Import Wizard ───────────────────────── */}
      {showImport && (
        <CustomerImportWizard
          onClose={() => setShowImport(false)}
          onImport={async (rows: CustomerImportRow[]) => {
            const result = await customersApi.import(
              rows.map(r => ({ name: r.name, phone: r.phone, address: r.address || undefined }))
            );
            queryClient.invalidateQueries({ queryKey: ['vendor', 'customers'] });
            return result;
          }}
        />
      )}

      {/* ── Segment Create/Edit Modal ─────────────────────── */}
      {showSegmentModal && (
        <SegmentBuilderModal
          existing={editSegment}
          onClose={() => setShowSegmentModal(false)}
          onSaved={() => { setShowSegmentModal(false); invalidateSegments(); }}
        />
      )}

      {broadcastFor && (
        <SegmentBroadcastModal
          segment={broadcastFor.segment}
          channel={broadcastFor.channel}
          onClose={() => setBroadcastFor(null)}
        />
      )}
    </div>
  );
}
