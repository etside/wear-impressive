import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  Order,
  OrderFulfillment,
  OrderTimelineEntry,
  Return,
  AbandonedCart,
} from '../types';

/* ── Orders ───────────────────────────────────────────────────────────── */

export interface OrderListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: Order['status'];
  payment_status?: Order['payment_status'];
  fulfillment_status?: Order['fulfillment_status'];
  customer_id?: number;
  branch_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface OrderCreatePayload {
  customer_id?: number | null;
  customer_address_id?: number | null;
  branch_id?: number | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_name?: string | null;
  items: { product_id: number; variant_id?: number | null; quantity: number; price?: number | string }[];
  discount_amount?: number | string;
  shipping_amount?: number | string;
  tax_amount?: number | string;
  payment_method?: string | null;
  coupon_code?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  shipping_address?: Record<string, unknown> | null;
  billing_address?: Record<string, unknown> | null;
  status?: Order['status'];
  payment_status?: Order['payment_status'];
}

export type OrderUpdatePayload = Partial<OrderCreatePayload>;

export interface MarkAsShippedPayload {
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  notes?: string | null;
}

export interface BulkActionPayload {
  ids: number[];
  action: 'cancel' | 'mark_packed' | 'mark_shipped' | 'mark_delivered' | 'delete' | 'export';
  payload?: Record<string, unknown>;
}

export const ordersApi = {
  async list(params?: OrderListParams): Promise<PaginatedResponse<Order>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/vendor/orders', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Order> {
    const res = await apiClient.get<ApiResponse<Order>>(`/vendor/orders/${id}`);
    return res.data.data!;
  },

  async create(data: OrderCreatePayload): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>('/vendor/orders', data);
    return res.data.data!;
  },

  async update(id: number, data: OrderUpdatePayload): Promise<Order> {
    const res = await apiClient.put<ApiResponse<Order>>(`/vendor/orders/${id}`, data);
    return res.data.data!;
  },

  async cancel(id: number, reason?: string): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/cancel`, { reason });
    return res.data.data!;
  },

  async markAsConfirmed(id: number): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/confirm`);
    return res.data.data!;
  },

  async markAsPacked(id: number, notes?: string): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/pack`, { notes });
    return res.data.data!;
  },

  async markAsShipped(id: number, data: MarkAsShippedPayload & { shipped_at?: string | null }): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/ship`, data);
    return res.data.data!;
  },

  async markAsDelivered(id: number, notes?: string): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/deliver`, { notes });
    return res.data.data!;
  },

  async markAsPaid(
    id: number,
    data: { payment_method?: string; payment_reference?: string; amount?: number | string }
  ): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/mark-paid`, data);
    return res.data.data!;
  },

  /**
   * Confirms the prepaid portion of a manual-payment order has landed —
   * vendor verifies screenshot/txn id against bKash/Nagad app, then calls
   * this. Bumps `amount_paid` to `advance_amount` and flips
   * `payment_status` to `partial` (or `paid` if no COD remainder).
   */
  async verifyAdvance(id: number): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/verify-advance`);
    return res.data.data!;
  },

  /**
   * Records cash-on-delivery collection. Settles the remaining balance
   * (`total - amount_paid`) and flips `payment_status` to `paid`.
   */
  async collectCod(id: number): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/collect-cod`);
    return res.data.data!;
  },

  async addNote(id: number, note: string, isInternal = true): Promise<Order> {
    const res = await apiClient.post<ApiResponse<Order>>(`/vendor/orders/${id}/notes`, {
      content: note,
      is_internal: isInternal,
    });
    return res.data.data!;
  },

  async timeline(id: number): Promise<OrderTimelineEntry[]> {
    const res = await apiClient.get<ApiResponse<OrderTimelineEntry[]>>(`/vendor/orders/${id}/timeline`);
    return res.data.data!;
  },

  async bulkAction(data: BulkActionPayload): Promise<{ success: number; failed: number }> {
    const res = await apiClient.post<ApiResponse<{ success: number; failed: number }>>(
      '/vendor/orders/bulk-action',
      data
    );
    return res.data.data!;
  },
};

/* ── Fulfillments ─────────────────────────────────────────────────────── */

export interface FulfillmentListParams {
  page?: number;
  per_page?: number;
  order_id?: number;
  status?: OrderFulfillment['status'];
}

export interface FulfillmentCreatePayload {
  order_id: number;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery?: string | null;
  cod_amount?: number | string;
  notes?: string | null;
  items: { order_item_id: number; quantity: number }[];
}

export type FulfillmentUpdatePayload = Partial<Omit<FulfillmentCreatePayload, 'order_id' | 'items'>> & {
  status?: OrderFulfillment['status'];
};

export const fulfillmentsApi = {
  async list(params?: FulfillmentListParams): Promise<PaginatedResponse<OrderFulfillment>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<OrderFulfillment>>>('/vendor/fulfillments', { params });
    return res.data.data!;
  },

  async get(orderId: number, fulfillmentId: number): Promise<OrderFulfillment> {
    const res = await apiClient.get<ApiResponse<OrderFulfillment>>(`/vendor/orders/${orderId}/fulfillments/${fulfillmentId}`);
    return res.data.data!;
  },

  async create(data: FulfillmentCreatePayload): Promise<OrderFulfillment> {
    const res = await apiClient.post<ApiResponse<OrderFulfillment>>(`/vendor/orders/${data.order_id}/fulfillments`, data);
    return res.data.data!;
  },

  async update(orderId: number, fulfillmentId: number, data: FulfillmentUpdatePayload): Promise<OrderFulfillment> {
    const res = await apiClient.patch<ApiResponse<OrderFulfillment>>(`/vendor/orders/${orderId}/fulfillments/${fulfillmentId}`, data);
    return res.data.data!;
  },

  async bookCourier(
    orderId: number,
    fulfillmentId: number,
    data: { partner: string; context?: Record<string, unknown> }
  ): Promise<{ fulfillment: OrderFulfillment; consignment_id: string | null; tracking_number: string | null; tracking_url: string | null }> {
    const res = await apiClient.post<ApiResponse<{ fulfillment: OrderFulfillment; consignment_id: string | null; tracking_number: string | null; tracking_url: string | null }>>(
      `/vendor/orders/${orderId}/fulfillments/${fulfillmentId}/courier/book`,
      data
    );
    return res.data.data!;
  },
};

/* ── Returns ──────────────────────────────────────────────────────────── */

export interface ReturnListParams {
  page?: number;
  per_page?: number;
  status?: Return['status'];
  order_id?: number;
  search?: string;
}

export const returnsApi = {
  async list(params?: ReturnListParams): Promise<PaginatedResponse<Return>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Return>>>('/vendor/returns', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Return> {
    const res = await apiClient.get<ApiResponse<Return>>(`/vendor/returns/${id}`);
    return res.data.data!;
  },

  async approve(id: number, notes?: string): Promise<Return> {
    const res = await apiClient.post<ApiResponse<Return>>(`/vendor/returns/${id}/approve`, { notes });
    return res.data.data!;
  },

  async reject(id: number, reason?: string): Promise<Return> {
    const res = await apiClient.post<ApiResponse<Return>>(`/vendor/returns/${id}/reject`, { reason });
    return res.data.data!;
  },

  async markReceived(id: number, notes?: string): Promise<Return> {
    const res = await apiClient.post<ApiResponse<Return>>(`/vendor/returns/${id}/mark-received`, { notes });
    return res.data.data!;
  },

  async processRefund(
    id: number,
    data: { amount: number | string; method?: string; notes?: string }
  ): Promise<Return> {
    const res = await apiClient.post<ApiResponse<Return>>(`/vendor/returns/${id}/refund`, data);
    return res.data.data!;
  },
};

/* ── Abandoned Carts ──────────────────────────────────────────────────── */

export interface AbandonedCartListParams {
  page?: number;
  per_page?: number;
  search?: string;
  recovered?: boolean;
  date_from?: string;
  date_to?: string;
}

export const abandonedCartsApi = {
  async list(params?: AbandonedCartListParams): Promise<PaginatedResponse<AbandonedCart>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<AbandonedCart>>>('/vendor/abandoned-carts', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<AbandonedCart> {
    const res = await apiClient.get<ApiResponse<AbandonedCart>>(`/vendor/abandoned-carts/${id}`);
    return res.data.data!;
  },

  async sendRecovery(id: number, data?: { subject?: string; message?: string }): Promise<AbandonedCart> {
    const res = await apiClient.post<ApiResponse<AbandonedCart>>(
      `/vendor/abandoned-carts/${id}/send-recovery`,
      data || {}
    );
    return res.data.data!;
  },

  async stats(params?: { date_from?: string; date_to?: string }): Promise<{
    total: number;
    recovered: number;
    recovery_rate: number;
    total_value: string;
    recovered_value: string;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        total: number;
        recovered: number;
        recovery_rate: number;
        total_value: string;
        recovered_value: string;
      }>
    >('/vendor/abandoned-carts/stats', { params });
    return res.data.data!;
  },
};
