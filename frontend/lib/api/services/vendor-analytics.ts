import { apiClient, type ApiResponse } from '../client';
import type {
  VendorStats,
  AnalyticsRevenueResponse,
  AnalyticsTopProduct,
  AnalyticsCustomersResponse,
} from '../types';

/* ── Vendor Stats (dashboard home) ────────────────────────────────────── */

export const vendorStatsApi = {
  async get(): Promise<VendorStats> {
    const res = await apiClient.get<ApiResponse<VendorStats>>('/vendor/stats');
    return res.data.data!;
  },
};

/* ── Vendor Analytics ─────────────────────────────────────────────────── */

export interface AnalyticsRevenueParams {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export const analyticsApi = {
  async revenue(params?: AnalyticsRevenueParams): Promise<AnalyticsRevenueResponse> {
    const res = await apiClient.get<ApiResponse<AnalyticsRevenueResponse>>(
      '/vendor/analytics/revenue',
      { params }
    );
    return res.data.data!;
  },

  async topProducts(): Promise<{ products: AnalyticsTopProduct[] }> {
    const res = await apiClient.get<ApiResponse<{ products: AnalyticsTopProduct[] }>>(
      '/vendor/analytics/top-products'
    );
    return res.data.data!;
  },

  async customers(): Promise<AnalyticsCustomersResponse> {
    const res = await apiClient.get<ApiResponse<AnalyticsCustomersResponse>>(
      '/vendor/analytics/customers'
    );
    return res.data.data!;
  },

  async profit(params: {
    date_from?: string;
    date_to?: string;
    category_id?: number | null;
    sub_category_id?: number | null;
  }): Promise<AnalyticsProfitResponse> {
    const res = await apiClient.get<ApiResponse<AnalyticsProfitResponse>>(
      '/vendor/analytics/profit',
      { params }
    );
    return res.data.data!;
  },

  /** Build the CSV download URL — opened directly in browser to trigger download. */
  profitCsvUrl(params: {
    date_from?: string;
    date_to?: string;
    category_id?: number | null;
    sub_category_id?: number | null;
  }): string {
    const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const qs = new URLSearchParams();
    qs.set('format', 'csv');
    if (params.date_from) qs.set('date_from', params.date_from);
    if (params.date_to) qs.set('date_to', params.date_to);
    if (params.category_id) qs.set('category_id', String(params.category_id));
    if (params.sub_category_id) qs.set('sub_category_id', String(params.sub_category_id));
    return `${base}/vendor/analytics/profit?${qs.toString()}`;
  },

  async paymentReport(params?: PaymentReportParams): Promise<PaymentReportResponse> {
    const res = await apiClient.get<ApiResponse<PaymentReportResponse>>(
      '/vendor/analytics/payments',
      { params }
    );
    return res.data.data!;
  },
};

export interface PaymentReportParams {
  date_from?: string;
  date_to?: string;
}

export interface PaymentReportRow {
  method: string;
  order_count: number;
  total: number;
}

export interface PaymentReportResponse {
  date_from: string;
  date_to: string;
  rows: PaymentReportRow[];
  grand_total: number;
}

export interface AnalyticsProfitRow {
  id: number;
  name: string;
  category_id: number | null;
  sub_category_id: number | null;
  qty_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface AnalyticsProfitResponse {
  date_from: string;
  date_to: string;
  rows: AnalyticsProfitRow[];
  totals: {
    qty_sold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  };
}

