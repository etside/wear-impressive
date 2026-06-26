import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { Customer, CustomerSegment, Review, Order } from '../types';

/* ── Customers ────────────────────────────────────────────────────────── */

export interface CustomerListParams {
  page?: number;
  per_page?: number;
  search?: string;
  tags?: string[];
  segment_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CustomerCreatePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  notes?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
}

export type CustomerUpdatePayload = Partial<CustomerCreatePayload>;

export interface CustomerImportRow {
  name: string;
  phone: string;
  address?: string;
}

export interface CustomerImportResult {
  imported: number;
  failed: number;
  errors?: Array<{ row: number; name: string; error: string }>;
}

export interface CustomerBulkActionPayload {
  ids: number[];
  action: 'delete' | 'add_tag' | 'remove_tag' | 'export';
  payload?: Record<string, unknown>;
}

export const customersApi = {
  async list(params?: CustomerListParams): Promise<PaginatedResponse<Customer>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Customer>>>('/vendor/customers', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Customer> {
    const res = await apiClient.get<ApiResponse<Customer>>(`/vendor/customers/${id}`);
    return res.data.data!;
  },

  async create(data: CustomerCreatePayload): Promise<Customer> {
    const res = await apiClient.post<ApiResponse<Customer>>('/vendor/customers', data);
    return res.data.data!;
  },

  async update(id: number, data: CustomerUpdatePayload): Promise<Customer> {
    const res = await apiClient.put<ApiResponse<Customer>>(`/vendor/customers/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/customers/${id}`);
  },

  async addNote(id: number, note: string): Promise<Customer> {
    const res = await apiClient.post<ApiResponse<Customer>>(`/vendor/customers/${id}/notes`, { note });
    return res.data.data!;
  },

  async bulkAction(data: CustomerBulkActionPayload): Promise<{ success: number; failed: number }> {
    const res = await apiClient.post<ApiResponse<{ success: number; failed: number }>>(
      '/vendor/customers/bulk-action',
      data
    );
    return res.data.data!;
  },

  async import(customers: CustomerImportRow[]): Promise<CustomerImportResult> {
    const res = await apiClient.post<ApiResponse<CustomerImportResult>>(
      '/vendor/customers/import',
      { customers }
    );
    return res.data.data!;
  },

  async orders(id: number, params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Order>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>(
      `/vendor/customers/${id}/orders`,
      { params }
    );
    return res.data.data!;
  },
};

/* ── Segments ─────────────────────────────────────────────────────────── */

export interface SegmentListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface SegmentCreatePayload {
  name: string;
  description?: string | null;
  conditions: Record<string, unknown>;
}

export type SegmentUpdatePayload = Partial<SegmentCreatePayload>;

export const segmentsApi = {
  async list(params?: SegmentListParams): Promise<PaginatedResponse<CustomerSegment>> {
    const res = await apiClient.get<ApiResponse<CustomerSegment[] | PaginatedResponse<CustomerSegment>>>(
      '/vendor/customer-segments',
      { params }
    );
    const raw = res.data.data;
    if (Array.isArray(raw)) {
      return { data: raw, current_page: 1, last_page: 1, per_page: raw.length, total: raw.length, from: null, to: null };
    }
    return raw ?? { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null };
  },

  async get(id: number): Promise<CustomerSegment> {
    const res = await apiClient.get<ApiResponse<CustomerSegment>>(`/vendor/customer-segments/${id}`);
    return res.data.data!;
  },

  async create(data: SegmentCreatePayload): Promise<CustomerSegment> {
    const res = await apiClient.post<ApiResponse<CustomerSegment>>('/vendor/customer-segments', data);
    return res.data.data!;
  },

  async update(id: number, data: SegmentUpdatePayload): Promise<CustomerSegment> {
    const res = await apiClient.put<ApiResponse<CustomerSegment>>(`/vendor/customer-segments/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/customer-segments/${id}`);
  },

  async calculate(id: number): Promise<{ customer_count: number }> {
    const res = await apiClient.post<ApiResponse<{ customer_count: number }>>(
      `/vendor/customer-segments/${id}/calculate`
    );
    return res.data.data!;
  },

  async customers(id: number, params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Customer>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Customer>>>(
      `/vendor/customer-segments/${id}/customers`,
      { params }
    );
    return res.data.data!;
  },

  async attributeOptions(): Promise<Array<{ label: string; values: string[] }>> {
    const res = await apiClient.get<ApiResponse<Array<{ label: string; values: string[] }>>>(
      '/vendor/customer-segments/attribute-options'
    );
    return res.data.data ?? [];
  },

  async preview(payload: { condition_match?: 'all' | 'any'; conditions: { match?: 'all' | 'any'; rules: unknown[] } }): Promise<{
    customer_count: number;
    sample: Array<{ id: number; name: string; email: string; phone: string | null; total_spent: string | null; total_orders: number }>;
  }> {
    const res = await apiClient.post<ApiResponse<{
      customer_count: number;
      sample: Array<{ id: number; name: string; email: string; phone: string | null; total_spent: string | null; total_orders: number }>;
    }>>('/vendor/customer-segments/preview', payload);
    return res.data.data!;
  },

  async broadcast(id: number, payload: { channel: 'email' | 'sms'; subject?: string; body: string }): Promise<{
    channel: 'email' | 'sms';
    recipients: number;
    queued: boolean;
  }> {
    const res = await apiClient.post<ApiResponse<{ channel: 'email' | 'sms'; recipients: number; queued: boolean }>>(
      `/vendor/customer-segments/${id}/broadcast`,
      payload
    );
    return res.data.data!;
  },
};

/* ── Reviews ──────────────────────────────────────────────────────────── */

export interface ReviewListParams {
  page?: number;
  per_page?: number;
  status?: Review['status'];
  product_id?: number;
  customer_id?: number;
  rating?: number;
  search?: string;
}

export const reviewsApi = {
  async list(params?: ReviewListParams): Promise<PaginatedResponse<Review>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Review>>>('/vendor/reviews', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Review> {
    const res = await apiClient.get<ApiResponse<Review>>(`/vendor/reviews/${id}`);
    return res.data.data!;
  },

  async approve(id: number): Promise<Review> {
    const res = await apiClient.post<ApiResponse<Review>>(`/vendor/reviews/${id}/approve`);
    return res.data.data!;
  },

  async reject(id: number, reason?: string): Promise<Review> {
    const res = await apiClient.post<ApiResponse<Review>>(`/vendor/reviews/${id}/reject`, { reason });
    return res.data.data!;
  },

  async reply(id: number, reply: string): Promise<Review> {
    const res = await apiClient.post<ApiResponse<Review>>(`/vendor/reviews/${id}/reply`, { reply });
    return res.data.data!;
  },

  async stats(params?: { product_id?: number; date_from?: string; date_to?: string }): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    average_rating: number;
    rating_distribution: Record<string, number>;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        average_rating: number;
        rating_distribution: Record<string, number>;
      }>
    >('/vendor/reviews/stats', { params });
    return res.data.data!;
  },
};
