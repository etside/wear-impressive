import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { CustomerAddress, WishlistItem, Review, Order, Cart } from '../types';

/* ── Addresses ────────────────────────────────────────────────────────── */

export interface AddressListParams {
  page?: number;
  per_page?: number;
}

export interface AddressCreatePayload {
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  division: string;
  district: string;
  thana: string;
  area?: string | null;
  postal_code?: string | null;
  is_default?: boolean;
}

export type AddressUpdatePayload = Partial<AddressCreatePayload>;

export const addressesApi = {
  async list(params?: AddressListParams): Promise<CustomerAddress[]> {
    // Backend returns a plain array (no pagination), wrapped in the standard
    // ApiResponse envelope. Returning the array directly keeps callers
    // simple: `addressesQuery.data` is the list.
    const res = await apiClient.get<ApiResponse<CustomerAddress[]>>('/customer/addresses', { params });
    return res.data.data ?? [];
  },

  async get(id: number): Promise<CustomerAddress> {
    const res = await apiClient.get<ApiResponse<CustomerAddress>>(`/customer/addresses/${id}`);
    return res.data.data!;
  },

  async create(data: AddressCreatePayload): Promise<CustomerAddress> {
    const res = await apiClient.post<ApiResponse<CustomerAddress>>('/customer/addresses', data);
    return res.data.data!;
  },

  async update(id: number, data: AddressUpdatePayload): Promise<CustomerAddress> {
    const res = await apiClient.put<ApiResponse<CustomerAddress>>(`/customer/addresses/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/customer/addresses/${id}`);
  },

  async setDefault(id: number): Promise<CustomerAddress> {
    const res = await apiClient.post<ApiResponse<CustomerAddress>>(`/customer/addresses/${id}/set-default`);
    return res.data.data!;
  },
};

/* ── Wishlist ─────────────────────────────────────────────────────────── */

export interface WishlistListParams {
  page?: number;
  per_page?: number;
}

export interface WishlistAddPayload {
  product_id: number;
  variant_id?: number | null;
}

export const wishlistApi = {
  async list(params?: WishlistListParams): Promise<PaginatedResponse<WishlistItem>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<WishlistItem>>>('/customer/wishlist', { params });
    return res.data.data!;
  },

  async add(data: WishlistAddPayload): Promise<WishlistItem> {
    const res = await apiClient.post<ApiResponse<WishlistItem>>('/customer/wishlist/add', data);
    return res.data.data!;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/customer/wishlist/${id}`);
  },

  async clear(): Promise<void> {
    await apiClient.delete<ApiResponse<null>>('/customer/wishlist/clear');
  },

  async moveToCart(id: number, quantity = 1): Promise<Cart> {
    const res = await apiClient.post<ApiResponse<Cart>>(`/customer/wishlist/${id}/move-to-cart`, {
      quantity,
    });
    return res.data.data!;
  },
};

/* ── Reviews (customer-side) ──────────────────────────────────────────── */

export interface CustomerReviewCreatePayload {
  product_id: number;
  order_id?: number | null;
  rating: number;
  title?: string | null;
  /** Backend column name. */
  content: string;
  images?: string[] | null;
}

export interface ReviewEligibility {
  eligible: boolean;
  reason: 'sign_in_required' | 'no_delivered_order' | 'already_reviewed' | null;
  existing_review: Review | null;
  order_id: number | null;
}

export const reviewsApi = {
  async create(data: CustomerReviewCreatePayload): Promise<Review> {
    const res = await apiClient.post<ApiResponse<Review>>('/customer/reviews', data);
    return res.data.data!;
  },

  async eligibility(productId: number): Promise<ReviewEligibility> {
    const res = await apiClient.get<ApiResponse<ReviewEligibility>>(
      `/customer/reviews/eligibility/${productId}`,
    );
    return res.data.data!;
  },
};

/* ── Customer Orders ──────────────────────────────────────────────────── */

export interface CustomerOrderListParams {
  page?: number;
  per_page?: number;
  status?: Order['status'];
}

export const customerOrdersApi = {
  async list(params?: CustomerOrderListParams): Promise<PaginatedResponse<Order>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/customer/orders', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Order> {
    const res = await apiClient.get<ApiResponse<Order>>(`/customer/orders/${id}`);
    return res.data.data!;
  },
};

/* ── Loyalty ──────────────────────────────────────────────────────────── */

export interface LoyaltyConfig {
  id: number;
  store_id: number;
  is_active: boolean;
  spend_amount_for_points: number | string;
  points_per_spend: number;
  redemption_value: number | string;
  min_redemption_points: number;
  points_expiry_days: number | null;
  welcome_bonus_points: number;
}

export interface LoyaltyAccount {
  id: number;
  store_id: number;
  customer_id: number;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  expires_at: string | null;
}

export interface LoyaltyTransaction {
  id: number;
  loyalty_account_id: number;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
}

export interface LoyaltySummary {
  config: LoyaltyConfig;
  account: LoyaltyAccount;
  transactions: LoyaltyTransaction[];
}

export const loyaltyApi = {
  async show(): Promise<LoyaltySummary> {
    const res = await apiClient.get<ApiResponse<LoyaltySummary>>('/customer/loyalty');
    return res.data.data!;
  },
};
