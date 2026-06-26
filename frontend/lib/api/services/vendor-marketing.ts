import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { Discount } from '../types';

/* ── Discounts / Coupons ──────────────────────────────────────────────── */

export interface DiscountListParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: Discount['type'];
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface DiscountCreatePayload {
  code: string;
  name?: string | null;
  description?: string | null;
  type: Discount['type'];
  value: number | string;
  minimum_amount?: number | string | null;
  maximum_discount?: number | string | null;
  applies_to?: Discount['applies_to'];
  applies_to_ids?: number[] | null;
  customer_eligibility?: Discount['customer_eligibility'];
  customer_ids?: number[] | null;
  usage_limit?: number | null;
  usage_limit_per_customer?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

export type DiscountUpdatePayload = Partial<DiscountCreatePayload>;

export interface DiscountValidateParams {
  code: string;
  subtotal?: number | string;
  customer_id?: number | null;
  product_ids?: number[];
}

export interface DiscountValidateResponse {
  valid: boolean;
  discount?: Discount;
  discount_amount?: string;
  message?: string;
}

export const discountsApi = {
  async list(params?: DiscountListParams): Promise<PaginatedResponse<Discount>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Discount>>>('/vendor/discounts', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Discount> {
    const res = await apiClient.get<ApiResponse<Discount>>(`/vendor/discounts/${id}`);
    return res.data.data!;
  },

  async create(data: DiscountCreatePayload): Promise<Discount> {
    const res = await apiClient.post<ApiResponse<Discount>>('/vendor/discounts', data);
    return res.data.data!;
  },

  async update(id: number, data: DiscountUpdatePayload): Promise<Discount> {
    const res = await apiClient.put<ApiResponse<Discount>>(`/vendor/discounts/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/discounts/${id}`);
  },

  async toggleActive(id: number): Promise<Discount> {
    const res = await apiClient.post<ApiResponse<Discount>>(`/vendor/discounts/${id}/toggle-active`);
    return res.data.data!;
  },

  async duplicate(id: number): Promise<Discount> {
    const res = await apiClient.post<ApiResponse<Discount>>(`/vendor/discounts/${id}/duplicate`);
    return res.data.data!;
  },

  async validate(params: DiscountValidateParams): Promise<DiscountValidateResponse> {
    const res = await apiClient.post<ApiResponse<DiscountValidateResponse>>('/vendor/discounts/validate', params);
    return res.data.data!;
  },
};

/* ── Catalogs (B2B / wholesale pricing) ──────────────────────────────── */

export interface Catalog {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  market_id: number | null;
  status: 'active' | 'draft';
  price_adjustment_type: 'increase' | 'decrease' | null;
  price_adjustment_percent: string | null;
  include_compare_price: boolean;
  auto_include_new: boolean;
  overrides_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogCreatePayload {
  name: string;
  description?: string | null;
  market_id?: number | null;
  status?: 'active' | 'draft';
  price_adjustment_type?: 'increase' | 'decrease' | null;
  price_adjustment_percent?: number | null;
  include_compare_price?: boolean;
  auto_include_new?: boolean;
}

export type CatalogUpdatePayload = Partial<CatalogCreatePayload>;

export const catalogsApi = {
  async list(params?: { search?: string; status?: 'active' | 'draft'; per_page?: number }): Promise<PaginatedResponse<Catalog>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Catalog>>>('/vendor/catalogs', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Catalog> {
    const res = await apiClient.get<ApiResponse<Catalog>>(`/vendor/catalogs/${id}`);
    return res.data.data!;
  },

  async create(data: CatalogCreatePayload): Promise<Catalog> {
    const res = await apiClient.post<ApiResponse<Catalog>>('/vendor/catalogs', data);
    return res.data.data!;
  },

  async update(id: number, data: CatalogUpdatePayload): Promise<Catalog> {
    const res = await apiClient.put<ApiResponse<Catalog>>(`/vendor/catalogs/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/catalogs/${id}`);
  },

  async setOverride(id: number, data: { product_id: number; included: boolean; override_price?: number; override_compare_price?: number }): Promise<unknown> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/vendor/catalogs/${id}/override`, data);
    return res.data.data!;
  },
};
