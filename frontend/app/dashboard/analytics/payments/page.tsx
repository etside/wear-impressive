'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, ChevronLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { MobileRowCard } from '@/components/ui/mobile-row-card';
import { analyticsApi, type PaymentReportRow } from '@/lib/api/services/vendor-analytics';
import { getApiErrorMessage } from '@/lib/api/client';

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number): string {
  return `৳${Math.round(n).toLocaleString()}`;
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Custom', days: -1 },
];

const METHOD_LABELS: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  sslcommerz: 'SSLCommerz',
  cod: 'Cash on Delivery',
  cash: 'Cash',
  card: 'Card',
  stripe: 'Stripe',
  manual: 'Manual',
  bank: 'Bank Transfer',
  other: 'Other',
  unknown: 'Unknown',
};

function methodLabel(method: string): string {
  return METHOD_LABELS[method.toLowerCase()] ?? method;
}

export default function PaymentsReportPage() {
  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateFrom, setDateFrom] = useState(fmtDate(thirtyAgo));
  const [dateTo, setDateTo] = useState(fmtDate(today));
  const [preset, setPreset] = useState(30);
  const [exporting, setExporting] = useState(false);

  const paymentsQuery = useQuery({
    queryKey: ['vendor', 'analytics', 'payments', dateFrom, dateTo],
    queryFn: () => analyticsApi.paymentReport({ date_from: dateFrom, date_to: dateTo }),
  });

  const data = paymentsQuery.data;
  const rows = data?.rows ?? [];
  const grandTotal = data?.grand_total ?? 0;
  const totalOrders = rows.reduce((s, r) => s + (r.order_count ?? 0), 0);

  const setPresetDays = (days: number) => {
    setPreset(days);
    if (days > 0) {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      setDateFrom(fmtDate(from));
      setDateTo(fmtDate(to));
    }
    // Custom: keep current dates, let user edit manually
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const header = ['Payment Method', 'Orders', 'Amount Received (BDT)'];
      const csvRows = rows.map((r: PaymentReportRow) => [
        methodLabel(r.method),
        String(r.order_count),
        String(r.total),
      ]);
      csvRows.push(['TOTAL', String(totalOrders), String(grandTotal)]);
      const csv = [header, ...csvRows]
        .map(row => row.map(cell => {
          const str = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wi-payments-${dateFrom}_to_${dateTo}.csv`;
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

  return (
    <div className="max-w-[1200px] mx-auto">
      <Link
        href="/dashboard/analytics"
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Analytics
      </Link>

      <PageHeader
        title="Payments Received"
        subtitle="Revenue breakdown by payment method"
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting || rows.length === 0}>
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export CSV
          </Button>
        }
      />

      {/* Date filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Preset buttons */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPresetDays(p.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                preset === p.days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPreset(-1); }}
            className="h-9 px-3 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPreset(-1); }}
            className="h-9 px-3 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white"
          />
        </div>
      </div>

      {/* Error */}
      {paymentsQuery.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {getApiErrorMessage(paymentsQuery.error, 'Failed to load payment report')}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Total Received"
          value={paymentsQuery.isLoading ? null : formatCurrency(grandTotal)}
        />
        <SummaryCard
          label="Payment Methods"
          value={paymentsQuery.isLoading ? null : String(rows.length)}
        />
        <SummaryCard
          label="Orders with Payment"
          value={paymentsQuery.isLoading ? null : String(totalOrders)}
        />
      </div>

      {/* Table — desktop */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Payment Method</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentsQuery.isLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-sm text-gray-400">Loading payment data...</td>
                </tr>
              )}
              {!paymentsQuery.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-sm text-gray-400">No payments received in this period.</td>
                </tr>
              )}
              {!paymentsQuery.isLoading && rows.map(row => (
                <tr key={row.method} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{methodLabel(row.method)}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{row.order_count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.total)}</td>
                </tr>
              ))}
              {/* Totals row */}
              {!paymentsQuery.isLoading && rows.length > 0 && (
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">{totalOrders}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(grandTotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3">
          {paymentsQuery.isLoading && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">Loading payment data...</div>
          )}
          {!paymentsQuery.isLoading && rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No payments received in this period.</div>
          )}
          {!paymentsQuery.isLoading && rows.length > 0 && (
            <div className="space-y-2">
              {rows.map(row => (
                <MobileRowCard
                  key={row.method}
                  header={
                    <span className="font-medium text-gray-900">{methodLabel(row.method)}</span>
                  }
                  trailing={
                    <span className="font-semibold text-gray-900 text-sm">{formatCurrency(row.total)}</span>
                  }
                  meta={
                    <span className="text-gray-500">{row.order_count} order{row.order_count === 1 ? '' : 's'}</span>
                  }
                />
              ))}
              {/* Mobile totals */}
              <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 mt-2">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-xs text-gray-500">{totalOrders} orders</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {value === null ? (
          <span className="inline-block w-24 h-6 bg-gray-100 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}
