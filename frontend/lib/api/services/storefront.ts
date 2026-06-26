import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  Product,
  ProductCategory,
  Brand,
  Collection,
  Cart,
  CheckoutCalculation,
  BlogPost,
  BlogCategory,
  CmsPage,
  Store,
  Order,
} from '../types';

/**
 * Public storefront API (no auth required for most endpoints).
 * All requests are scoped to a store via the `X-Store-Handle` header
 * (set by the storefront interceptor) or a subdomain in production.
 */

/* ── Public Products ──────────────────────────────────────────────────── */

export interface PublicProductListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  category_slug?: string;
  sub_category_id?: number;
  brand_id?: number;
  brand_slug?: string;
  collection_id?: number;
  collection_slug?: string;
  tags?: string[];
  price_min?: number;
  price_max?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  in_stock?: boolean;
  featured?: boolean;
}

export interface PublicProductSearchParams {
  q: string;
  page?: number;
  per_page?: number;
  category_id?: number;
}

export const publicProductsApi = {
  async list(params?: PublicProductListParams): Promise<PaginatedResponse<Product>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/store/products', { params });
    return res.data.data!;
  },

  async get(slug: string): Promise<Product> {
    const res = await apiClient.get<ApiResponse<Product>>(`/store/products/${slug}`);
    return res.data.data!;
  },

  async search(params: PublicProductSearchParams): Promise<PaginatedResponse<Product>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/store/products/search', { params });
    return res.data.data!;
  },
};

/* ── Public Categories ────────────────────────────────────────────────── */

export interface PublicCategoryListParams {
  parent_id?: number | null;
  is_active?: boolean;
  /** Include sub-categories (default backend behaviour: top-level only). */
  all?: boolean | 1;
}

export const publicCategoriesApi = {
  async list(params?: PublicCategoryListParams): Promise<ProductCategory[]> {
    const res = await apiClient.get<ApiResponse<ProductCategory[]>>('/store/categories', { params });
    return res.data.data!;
  },

  async get(slug: string): Promise<ProductCategory> {
    const res = await apiClient.get<ApiResponse<ProductCategory>>(`/store/categories/${slug}`);
    return res.data.data!;
  },
};

/* ── Public Brands ────────────────────────────────────────────────────── */

export interface PublicBrandListParams {
  featured?: boolean;
  category_id?: number;
}

export const publicBrandsApi = {
  async list(params?: PublicBrandListParams): Promise<Brand[]> {
    const res = await apiClient.get<ApiResponse<Brand[]>>('/store/brands', { params });
    return res.data.data!;
  },

  async get(slug: string): Promise<Brand> {
    const res = await apiClient.get<ApiResponse<Brand>>(`/store/brands/${slug}`);
    return res.data.data!;
  },
};

/* ── Public Collections ───────────────────────────────────────────────── */

export interface PublicCollectionListParams {
  page?: number;
  per_page?: number;
}

export const publicCollectionsApi = {
  async list(params?: PublicCollectionListParams): Promise<PaginatedResponse<Collection>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Collection>>>('/store/collections', { params });
    return res.data.data!;
  },

  async get(slug: string): Promise<Collection> {
    const res = await apiClient.get<ApiResponse<Collection>>(`/store/collections/${slug}`);
    return res.data.data!;
  },
};

/* ── Cart ─────────────────────────────────────────────────────────────── */

export interface CartAddPayload {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  /**
   * Bundle products — one entry per component the customer is buying.
   * Send the chosen variant_id (or null for components without variants).
   */
  components?: Array<{
    component_product_id: number;
    variant_id: number | null;
  }>;
}

export interface CartUpdatePayload {
  quantity?: number;
  /** Optional — pass to swap the variant directly from the cart page. */
  variant_id?: number | null;
}

interface BackendCartItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  price: number;
  price_snapshot: number;
  line_total: number;
  is_bundle?: boolean;
  product: {
    id: number;
    name: string;
    slug: string;
    product_type?: 'physical' | 'digital' | 'bundle';
    featured_image: string | null;
    images?: string[];
    track_inventory: boolean;
    stock: number;
  } | null;
  variant: {
    id: number;
    sku: string;
    options: Record<string, string> | null;
    image: string | null;
    stock: number;
  } | null;
  components?: Array<{
    id: number;
    product_id: number;
    variant_id: number | null;
    quantity: number;
    product: {
      id: number;
      name: string;
      slug: string;
      featured_image: string | null;
    } | null;
    variant: {
      id: number;
      sku: string;
      options: Record<string, string> | null;
      image: string | null;
    } | null;
  }>;
}

interface BackendCartResponse {
  cart_token: string | null;
  customer_id: number | null;
  items: BackendCartItem[];
  coupon: { code: string; name: string; type: string; value: number; discount_amount: number } | null;
  totals: { subtotal: number; discount: number; shipping_estimate: number; tax: number; total: number };
}

/**
 * Flatten the backend cart envelope (`{items, coupon, totals}`) into the flat
 * `Cart` shape the UI expects (`{items, subtotal, discount_amount, total, coupon_code}`).
 */
function adaptCart(raw: BackendCartResponse): Cart {
  return {
    id: null,
    store_id: 0,
    customer_id: raw.customer_id,
    session_id: raw.cart_token,
    items: (raw.items ?? []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      variant_id: it.variant_id,
      product_name: it.product?.name ?? '',
      variant_label: it.variant?.options
        ? Object.values(it.variant.options).join(' / ')
        : null,
      sku: it.variant?.sku ?? null,
      image: it.variant?.image ?? it.product?.featured_image ?? null,
      price: String(it.price),
      quantity: it.quantity,
      subtotal: String(it.line_total),
      total: String(it.line_total),
      is_bundle: !!it.is_bundle,
      components: (it.components ?? []).map((c) => ({
        id: c.id,
        product_id: c.product_id,
        variant_id: c.variant_id,
        quantity: c.quantity,
        product_name: c.product?.name ?? '',
        variant_label: c.variant?.options
          ? Object.values(c.variant.options).join(' / ')
          : null,
        image: c.variant?.image ?? c.product?.featured_image ?? null,
      })),
    })),
    subtotal: String(raw.totals?.subtotal ?? 0),
    discount_amount: String(raw.totals?.discount ?? 0),
    shipping_amount: String(raw.totals?.shipping_estimate ?? 0),
    tax_amount: String(raw.totals?.tax ?? 0),
    total: String(raw.totals?.total ?? 0),
    coupon_code: raw.coupon?.code ?? null,
    currency: 'BDT',
  };
}

export const cartApi = {
  async show(): Promise<Cart> {
    const res = await apiClient.get<ApiResponse<BackendCartResponse>>('/store/cart');
    return adaptCart(res.data.data!);
  },

  async add(data: CartAddPayload): Promise<Cart> {
    const res = await apiClient.post<ApiResponse<BackendCartResponse>>('/store/cart/items', data);
    return adaptCart(res.data.data!);
  },

  async update(itemId: number, data: CartUpdatePayload): Promise<Cart> {
    const res = await apiClient.patch<ApiResponse<BackendCartResponse>>(`/store/cart/items/${itemId}`, data);
    return adaptCart(res.data.data!);
  },

  async remove(itemId: number): Promise<Cart> {
    const res = await apiClient.delete<ApiResponse<BackendCartResponse>>(`/store/cart/items/${itemId}`);
    return adaptCart(res.data.data!);
  },

  async clear(): Promise<Cart> {
    const res = await apiClient.delete<ApiResponse<BackendCartResponse>>('/store/cart/clear');
    return adaptCart(res.data.data!);
  },

  async applyCoupon(code: string): Promise<Cart> {
    const res = await apiClient.post<ApiResponse<BackendCartResponse>>('/store/cart/apply-coupon', { code });
    return adaptCart(res.data.data!);
  },

  async removeCoupon(): Promise<Cart> {
    const res = await apiClient.delete<ApiResponse<BackendCartResponse>>('/store/cart/coupon');
    return adaptCart(res.data.data!);
  },
};

/* ── Checkout ─────────────────────────────────────────────────────────── */

export interface CheckoutCalculatePayload {
  address_id?: number | null;
  shipping_address?: Record<string, unknown>;
  shipping_rate_id?: number | null;
  payment_method?: string | null;
  coupon_code?: string | null;
}

export interface CheckoutPlacePayload {
  customer_id?: number | null;
  address_id?: number | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_name?: string | null;
  shipping_address: Record<string, unknown>;
  billing_address?: Record<string, unknown> | null;
  shipping_rate_id?: number | null;
  payment_method: string;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  // Identifier of the manual payment channel the customer selected. Was a
  // fixed enum; now accepts vendor-defined channel ids (e.g. "ch_abc123") and
  // still accepts the legacy bkash/nagad/rocket short codes for compat.
  payment_wallet?: string | null;
  coupon_code?: string | null;
  notes?: string | null;
}

export interface CheckoutPlaceResponse {
  order_id: number;
  order_number: string;
  requires_payment?: boolean;
  payment_method?: string;
  // Full order is returned for COD/manual; gateway flows only return the above 4.
  status?: Order['status'];
  total?: string;
}

export interface PaymentInitiateResponse {
  redirect_url: string;
  gateway_reference: string;
}

export const checkoutApi = {
  async calculate(data: CheckoutCalculatePayload): Promise<CheckoutCalculation> {
    const res = await apiClient.post<ApiResponse<CheckoutCalculation>>('/store/checkout/calculate', data);
    return res.data.data!;
  },

  async place(data: CheckoutPlacePayload): Promise<CheckoutPlaceResponse> {
    const res = await apiClient.post<ApiResponse<CheckoutPlaceResponse>>('/store/checkout/place', data);
    return res.data.data!;
  },

  async uploadProof(file: File): Promise<{ path: string; url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    // Let axios infer the multipart boundary by passing `undefined` for Content-Type.
    const res = await apiClient.post<ApiResponse<{ path: string; url: string }>>(
      '/store/checkout/upload-proof',
      fd,
      { headers: { 'Content-Type': undefined } as unknown as Record<string, string> }
    );
    return res.data.data!;
  },
};

export const paymentApi = {
  async initiate(orderId: number): Promise<PaymentInitiateResponse> {
    const res = await apiClient.post<ApiResponse<PaymentInitiateResponse>>(
      `/store/payment/initiate/${orderId}`
    );
    return res.data.data!;
  },
};

/* ── Public checkout field settings ───────────────────────────────────── */

export interface PublicCheckoutField {
  field_key: string;
  field_type: 'text' | 'email' | 'phone' | 'number' | 'url' | 'select' | 'radio' | 'checkbox' | 'date' | 'textarea' | 'attachment';
  label: string;
  placeholder: string | null;
  options: string[] | null;
  requirement: 'required' | 'optional';
  is_custom: boolean;
  sort_order: number;
}

export interface PublicCheckoutConfig {
  fields: PublicCheckoutField[];
  name_mode: 'split' | 'full';
}

export const publicCheckoutFieldsApi = {
  async list(): Promise<PublicCheckoutField[]> {
    const res = await apiClient.get<ApiResponse<PublicCheckoutConfig>>('/store/checkout-fields');
    return res.data.data?.fields ?? [];
  },
  async config(): Promise<PublicCheckoutConfig> {
    const res = await apiClient.get<ApiResponse<PublicCheckoutConfig>>('/store/checkout-fields');
    return res.data.data ?? { fields: [], name_mode: 'split' };
  },
};

/* ── Public Blog ──────────────────────────────────────────────────────── */

export interface PublicBlogListParams {
  page?: number;
  per_page?: number;
  category_id?: number;
  category_slug?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
}

export const publicBlogApi = {
  async list(params?: PublicBlogListParams): Promise<PaginatedResponse<BlogPost>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<BlogPost>>>('/store/blog', { params });
    return res.data.data!;
  },

  async get(slug: string): Promise<BlogPost> {
    const res = await apiClient.get<ApiResponse<BlogPost>>(`/store/blog/${slug}`);
    return res.data.data!;
  },

  async categories(): Promise<BlogCategory[]> {
    const res = await apiClient.get<ApiResponse<BlogCategory[]>>('/store/blog/categories');
    return res.data.data!;
  },
};

/* ── Public Pages ─────────────────────────────────────────────────────── */

export const publicPagesApi = {
  async get(slug: string): Promise<CmsPage> {
    const res = await apiClient.get<ApiResponse<CmsPage>>(`/store/pages/${slug}`);
    return res.data.data!;
  },
};

/* ── Store Info ───────────────────────────────────────────────────────── */

interface StoreInfoResponse {
  store: Store;
  theme?: unknown;
  settings?: Record<string, unknown>;
  /** Keyed by menu `handle` (e.g. "main-menu", "footer-menu"). */
  menus?: Record<string, { id: number; name: string; handle: string; items: Array<{ label: string; url: string; target?: '_self' | '_blank' }> }>;
}

export const storeInfoApi = {
  async show(): Promise<Store> {
    const res = await apiClient.get<ApiResponse<StoreInfoResponse>>('/store/info');
    return res.data.data!.store;
  },

  async full(): Promise<StoreInfoResponse> {
    const res = await apiClient.get<ApiResponse<StoreInfoResponse>>('/store/info');
    return res.data.data!;
  },
};

/* ── Order Tracking ───────────────────────────────────────────────────── */

export interface OrderTrackPayload {
  order_number: string;
  email?: string;
  phone?: string;
}

export const orderTrackingApi = {
  async track(data: OrderTrackPayload): Promise<Order> {
    const params: Record<string, string> = {};
    if (data.email) params.email = data.email;
    if (data.phone) params.phone = data.phone;
    const res = await apiClient.get<ApiResponse<Order>>(
      `/store/orders/track/${encodeURIComponent(data.order_number)}`,
      { params }
    );
    return res.data.data!;
  },
};

/* ── Contact Form ─────────────────────────────────────────────────────── */

export interface ContactFormPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const contactApi = {
  async submit(data: ContactFormPayload): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/store/contact', data);
  },
};

/* ── Shops directory (no store context) ──────────────────────────────── */

export interface ShopsDirectoryParams {
  search?: string;
  per_page?: number;
  page?: number;
}

export interface ShopDirectoryEntry {
  id: number;
  name: string;
  handle: string;
  description: string | null;
  logo: string | null;
  primary_language: string;
  country: string;
  products_count?: number;
}

export const shopsApi = {
  async list(params?: ShopsDirectoryParams) {
    const res = await apiClient.get<ApiResponse<{
      data: ShopDirectoryEntry[];
      current_page: number;
      last_page: number;
      total: number;
    }>>('/shops', { params });
    return res.data.data!;
  },
};

// ─── Meta Pixel ───────────────────────────────────────────────────────────────
export interface StorefrontPixelConfig {
  enabled: boolean;
  pixel_id?: string;
  track_view_content?: boolean;
  track_add_to_cart?: boolean;
  track_initiate_checkout?: boolean;
  track_purchase?: boolean;
}

export const metaPixelStorefrontApi = {
  async config(): Promise<StorefrontPixelConfig> {
    const res = await apiClient.get<ApiResponse<StorefrontPixelConfig>>('/store/meta-pixel');
    return res.data.data ?? { enabled: false };
  },
};

// ─── Google Tag Manager ──────────────────────────────────────────────────────
export interface StorefrontGtmConfig {
  enabled: boolean;
  gtm_id?: string;
}

export const gtmStorefrontApi = {
  async config(): Promise<StorefrontGtmConfig> {
    const res = await apiClient.get<ApiResponse<StorefrontGtmConfig>>('/store/google-tag-manager');
    return res.data.data ?? { enabled: false };
  },
};
