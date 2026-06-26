import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { Product, ProductVariant, ProductCategory, Brand, Collection } from '../types';

/* ── Products ─────────────────────────────────────────────────────────── */

export interface ProductListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  sub_category_id?: number;
  brand_id?: number;
  status?: 'draft' | 'active' | 'archived';
  product_type?: 'physical' | 'digital' | 'bundle';
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductCustomTab {
  name_en: string;
  name_bn?: string | null;
  content_en?: string | null;
  content_bn?: string | null;
}

export interface ProductCreatePayload {
  name: string;
  category_id: number;
  sub_category_id?: number | null;
  brand_id?: number | null;
  product_type?: 'physical' | 'digital' | 'bundle';
  short_description?: string | null;
  description?: string | null;
  /** Vendor-defined extra tabs rendered after the Description on the storefront. */
  custom_tabs?: ProductCustomTab[] | null;
  price: number | string;
  discount?: number | string | null;
  discount_type?: 'flat' | 'percent' | null;
  cost_price?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  weight_value?: number | string | null;
  weight_unit?: 'g' | 'kg' | 'lb' | 'oz';
  has_variants?: boolean;
  track_inventory?: boolean;
  stock?: number;
  low_stock_threshold?: number;
  images?: string[];
  featured_image?: string | null;
  cover_image?: string | null;
  tags?: string[];
  meta_title?: string | null;
  meta_description?: string | null;
  url_handle?: string | null;
  /** Optional YouTube URL — surfaces a "Watch Video" button on the product page. */
  video_url?: string | null;
  /** Optional YouTube URL — surfaces a "Size Guide" link on the product page. */
  size_guide_url?: string | null;
  status?: 'draft' | 'active' | 'archived';
  is_taxable?: boolean;
  tax_rate?: number | string;
  published_at?: string | null;
  /** Variant rows — sent when has_variants is true. */
  variants?: Array<{
    options: Record<string, string>;
    price: number | string;
    discount?: number | string | null;
    discount_type?: 'flat' | 'percent' | null;
    cost_price?: number | string | null;
    stock?: number;
    sku?: string | null;
    barcode?: string | null;
    image?: string | null;
    id?: number;
  }>;
  /** Bundle pricing — sent when product_type='bundle'. */
  bundle_pricing_strategy?: 'sum' | 'fixed' | 'percent' | null;
  bundle_price?: number | string | null;
  bundle_discount_percent?: number | string | null;
  bundle_compare_at_price?: number | string | null;
  /** One row per component product the bundle includes. */
  bundle_components?: Array<{
    component_product_id: number;
    quantity?: number;
    sort_order?: number;
    is_required?: boolean;
  }>;
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

interface VendorProductListResponse {
  products: Product[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  counts?: Record<string, number>;
}

export const productsApi = {
  async list(params?: ProductListParams): Promise<PaginatedResponse<Product>> {
    const res = await apiClient.get<ApiResponse<VendorProductListResponse | PaginatedResponse<Product>>>(
      '/vendor/products',
      { params }
    );
    const raw = res.data.data;
    // Backend shape: {products, meta: {...}, counts: {...}}
    if (raw && 'products' in raw) {
      return {
        data: raw.products ?? [],
        current_page: raw.meta?.current_page ?? 1,
        last_page: raw.meta?.last_page ?? 1,
        per_page: raw.meta?.per_page ?? 20,
        total: raw.meta?.total ?? 0,
        from: null,
        to: null,
      };
    }
    return (raw as PaginatedResponse<Product>) ?? { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null };
  },

  async get(id: number): Promise<Product> {
    const res = await apiClient.get<ApiResponse<Product>>(`/vendor/products/${id}`);
    return res.data.data!;
  },

  async create(data: ProductCreatePayload): Promise<Product> {
    const res = await apiClient.post<ApiResponse<Product>>('/vendor/products', data);
    return res.data.data!;
  },

  async update(id: number, data: ProductUpdatePayload): Promise<Product> {
    const res = await apiClient.put<ApiResponse<Product>>(`/vendor/products/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/products/${id}`);
  },

  async duplicate(id: number): Promise<Product> {
    const res = await apiClient.post<ApiResponse<Product>>(`/vendor/products/${id}/duplicate`);
    return res.data.data!;
  },

  async bulkDelete(ids: number[]): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/vendor/products/bulk-delete', { ids });
  },

  async import(file: File): Promise<{ imported: number; failed: number; errors?: string[] }> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<ApiResponse<{ imported: number; failed: number; errors?: string[] }>>(
      '/vendor/products/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data!;
  },
};

/* ── Variants ─────────────────────────────────────────────────────────── */

export interface VariantCreatePayload {
  sku?: string | null;
  barcode?: string | null;
  options: Record<string, string>;
  price: number | string;
  discount?: number | string | null;
  discount_type?: 'flat' | 'percent' | null;
  cost_price?: number | string | null;
  stock?: number;
  image?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export type VariantUpdatePayload = Partial<VariantCreatePayload>;

export const variantsApi = {
  async create(productId: number, data: VariantCreatePayload): Promise<ProductVariant> {
    const res = await apiClient.post<ApiResponse<ProductVariant>>(
      `/vendor/products/${productId}/variants`,
      data
    );
    return res.data.data!;
  },

  async update(productId: number, variantId: number, data: VariantUpdatePayload): Promise<ProductVariant> {
    const res = await apiClient.put<ApiResponse<ProductVariant>>(
      `/vendor/products/${productId}/variants/${variantId}`,
      data
    );
    return res.data.data!;
  },

  async delete(productId: number, variantId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/products/${productId}/variants/${variantId}`);
  },
};

/* ── Categories ───────────────────────────────────────────────────────── */

export interface CategoryListParams {
  page?: number;
  per_page?: number;
  search?: string;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface CategoryCreatePayload {
  parent_id?: number | null;
  name: string;
  slug?: string;
  description?: string | null;
  icon_type?: 'lucide' | 'upload' | null;
  icon_name?: string | null;
  icon_url?: string | null;
  image?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export type CategoryUpdatePayload = Partial<CategoryCreatePayload>;

function adaptList<T>(raw: unknown, key: string): PaginatedResponse<T> {
  const empty: PaginatedResponse<T> = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null };
  if (!raw || typeof raw !== 'object') return empty;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj[key])) {
    const m = (obj.meta ?? {}) as Record<string, number>;
    return {
      data: obj[key] as T[],
      current_page: m.current_page ?? 1,
      last_page: m.last_page ?? 1,
      per_page: m.per_page ?? 20,
      total: m.total ?? (obj[key] as T[]).length,
      from: null,
      to: null,
    };
  }
  if (Array.isArray(obj.data)) return obj as unknown as PaginatedResponse<T>;
  return empty;
}

export const categoriesApi = {
  async list(params?: CategoryListParams): Promise<PaginatedResponse<ProductCategory>> {
    const res = await apiClient.get<ApiResponse<unknown>>('/vendor/product-categories', { params });
    return adaptList<ProductCategory>(res.data.data, 'categories');
  },

  async get(id: number): Promise<ProductCategory> {
    const res = await apiClient.get<ApiResponse<ProductCategory>>(`/vendor/product-categories/${id}`);
    return res.data.data!;
  },

  async create(data: CategoryCreatePayload): Promise<ProductCategory> {
    const res = await apiClient.post<ApiResponse<ProductCategory>>('/vendor/product-categories', data);
    return res.data.data!;
  },

  async update(id: number, data: CategoryUpdatePayload): Promise<ProductCategory> {
    const res = await apiClient.put<ApiResponse<ProductCategory>>(`/vendor/product-categories/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/product-categories/${id}`);
  },

  async reorder(order: { id: number; sort_order: number; parent_id?: number | null }[]): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/vendor/product-categories/reorder', { order });
  },
};

/* ── Brands ───────────────────────────────────────────────────────────── */

export interface BrandListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  featured?: boolean;
  is_active?: boolean;
}

export interface BrandCreatePayload {
  category_id?: number | null;
  sub_category_id?: number | null;
  name: string;
  slug?: string;
  description?: string | null;
  logo_type?: 'lucide' | 'upload' | null;
  logo_name?: string | null;
  logo_url?: string | null;
  website?: string | null;
  featured?: boolean;
  is_active?: boolean;
}

export type BrandUpdatePayload = Partial<BrandCreatePayload>;

export const brandsApi = {
  async list(params?: BrandListParams): Promise<PaginatedResponse<Brand>> {
    const res = await apiClient.get<ApiResponse<unknown>>('/vendor/brands', { params });
    return adaptList<Brand>(res.data.data, 'brands');
  },

  async get(id: number): Promise<Brand> {
    const res = await apiClient.get<ApiResponse<Brand>>(`/vendor/brands/${id}`);
    return res.data.data!;
  },

  async create(data: BrandCreatePayload): Promise<Brand> {
    const res = await apiClient.post<ApiResponse<Brand>>('/vendor/brands', data);
    return res.data.data!;
  },

  async update(id: number, data: BrandUpdatePayload): Promise<Brand> {
    const res = await apiClient.put<ApiResponse<Brand>>(`/vendor/brands/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/brands/${id}`);
  },

  async toggleFeatured(id: number): Promise<Brand> {
    const res = await apiClient.post<ApiResponse<Brand>>(`/vendor/brands/${id}/toggle-featured`);
    return res.data.data!;
  },
};

/* ── Collections ──────────────────────────────────────────────────────── */

export interface CollectionListParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: 'manual' | 'automatic';
  is_active?: boolean;
}

export interface CollectionCreatePayload {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  type?: 'manual' | 'automatic';
  conditions?: Record<string, unknown> | null;
  is_active?: boolean;
}

export type CollectionUpdatePayload = Partial<CollectionCreatePayload>;

export const collectionsApi = {
  async list(params?: CollectionListParams): Promise<PaginatedResponse<Collection>> {
    const res = await apiClient.get<ApiResponse<unknown>>('/vendor/collections', { params });
    return adaptList<Collection>(res.data.data, 'collections');
  },

  async get(id: number): Promise<Collection> {
    const res = await apiClient.get<ApiResponse<Collection>>(`/vendor/collections/${id}`);
    return res.data.data!;
  },

  async create(data: CollectionCreatePayload): Promise<Collection> {
    const res = await apiClient.post<ApiResponse<Collection>>('/vendor/collections', data);
    return res.data.data!;
  },

  async update(id: number, data: CollectionUpdatePayload): Promise<Collection> {
    const res = await apiClient.put<ApiResponse<Collection>>(`/vendor/collections/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/collections/${id}`);
  },

  async addProducts(id: number, productIds: number[]): Promise<Collection> {
    const res = await apiClient.post<ApiResponse<Collection>>(
      `/vendor/collections/${id}/products`,
      { product_ids: productIds }
    );
    return res.data.data!;
  },

  async removeProducts(id: number, productIds: number[]): Promise<Collection> {
    const res = await apiClient.delete<ApiResponse<Collection>>(
      `/vendor/collections/${id}/products`,
      { data: { product_ids: productIds } }
    );
    return res.data.data!;
  },
};
