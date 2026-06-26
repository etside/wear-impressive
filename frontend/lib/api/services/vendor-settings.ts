import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  Store,
  StoreSetting,
  CheckoutField,
  ShippingZone,
  ShippingRate,
  PaymentMethod,
  DeliveryPartner,
  TaxRule,
  EmailTemplate,
} from '../types';

/* ── Settings (all) ───────────────────────────────────────────────────── */

export interface SettingsBulkUpdatePayload {
  settings: {
    key: string;
    value: StoreSetting['value'];
    type?: 'string' | 'boolean' | 'integer' | 'decimal' | 'json';
    group?: string;
  }[];
}

type SettingsArrayOrMap =
  | StoreSetting[]
  | Record<string, StoreSetting['value']>
  | null
  | undefined;

function flattenSettings(d: SettingsArrayOrMap): Record<string, StoreSetting['value']> {
  if (Array.isArray(d)) {
    return d.reduce<Record<string, StoreSetting['value']>>((acc, row) => {
      if (row?.key != null) acc[row.key] = row.value;
      return acc;
    }, {});
  }
  return (d ?? {}) as Record<string, StoreSetting['value']>;
}

export const settingsApi = {
  async get(): Promise<Record<string, StoreSetting['value']>> {
    const res = await apiClient.get<ApiResponse<SettingsArrayOrMap>>('/vendor/settings');
    return flattenSettings(res.data.data);
  },

  async update(data: SettingsBulkUpdatePayload): Promise<Record<string, StoreSetting['value']>> {
    const res = await apiClient.put<ApiResponse<SettingsArrayOrMap>>('/vendor/settings', data);
    return flattenSettings(res.data.data);
  },
};

/* ── General ──────────────────────────────────────────────────────────── */

export interface GeneralSettingsUpdatePayload {
  name?: string;
  email?: string;
  phone?: string | null;
  country?: string;
  currency?: string;
  timezone?: string;
  primary_language?: 'en' | 'bn' | 'both';
  description?: string | null;
  address_line_1?: string | null;
  division?: string | null;
  district?: string | null;
  thana?: string | null;
  postal_code?: string | null;
}

function unwrapStore(d: Store | { store: Store } | null | undefined): Store {
  if (d && typeof d === 'object' && 'store' in d) return (d as { store: Store }).store;
  return (d ?? {}) as Store;
}

export const generalApi = {
  async get(): Promise<Store> {
    const res = await apiClient.get<ApiResponse<Store | { store: Store }>>('/vendor/settings/general');
    return unwrapStore(res.data.data);
  },

  async update(data: GeneralSettingsUpdatePayload): Promise<Store> {
    const res = await apiClient.patch<ApiResponse<Store | { store: Store }>>('/vendor/settings/general', data);
    return unwrapStore(res.data.data);
  },
};

/* ── Branding ─────────────────────────────────────────────────────────── */

export interface BrandingUpdatePayload {
  logo?: File | null;
  favicon?: File | null;
  social_banner?: File | null;
  primary_color?: string;
  accent_color?: string;
  remove_logo?: boolean;
  remove_favicon?: boolean;
  remove_social_banner?: boolean;
}

export interface BrandingUpdateResponse {
  store: Store;
  logo_url: string | null;
  favicon_url: string | null;
  social_banner_url: string | null;
}

export const brandingApi = {
  async update(data: BrandingUpdatePayload): Promise<BrandingUpdateResponse> {
    const form = new FormData();
    if (data.logo)          form.append('logo', data.logo);
    if (data.favicon)       form.append('favicon', data.favicon);
    if (data.social_banner) form.append('social_banner', data.social_banner);
    if (data.primary_color) form.append('primary_color', data.primary_color);
    if (data.accent_color)  form.append('accent_color', data.accent_color);
    if (data.remove_logo)          form.append('remove_logo', '1');
    if (data.remove_favicon)       form.append('remove_favicon', '1');
    if (data.remove_social_banner) form.append('remove_social_banner', '1');
    // Use POST + _method=PATCH because some servers/PHP setups don't parse
    // multipart bodies on PATCH. Laravel honours the override.
    form.append('_method', 'PATCH');
    const res = await apiClient.post<ApiResponse<BrandingUpdateResponse>>(
      '/vendor/settings/branding',
      form,
      { headers: { 'Content-Type': undefined } as unknown as Record<string, string> }
    );
    return res.data.data!;
  },
};

/* ── Checkout Fields ──────────────────────────────────────────────────── */

export interface CheckoutFieldUpdatePayload {
  fields: Partial<CheckoutField>[];
}

export const checkoutFieldsApi = {
  async list(): Promise<CheckoutField[]> {
    const res = await apiClient.get<ApiResponse<CheckoutField[]>>('/vendor/settings/checkout-fields');
    return res.data.data!;
  },

  async update(data: CheckoutFieldUpdatePayload): Promise<CheckoutField[]> {
    const res = await apiClient.put<ApiResponse<CheckoutField[]>>(
      '/vendor/settings/checkout-fields',
      data
    );
    return res.data.data!;
  },
};

/* ── Shipping Zones ───────────────────────────────────────────────────── */

export interface ShippingZoneListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
}

export interface ShippingZoneCreatePayload {
  name: string;
  districts?: string[];
  coverage?: Record<string, unknown> | null;
  flat_rate: number;
  free_shipping_threshold?: number | null;
  delivery_estimate?: string | null;
  is_active?: boolean;
}

export type ShippingZoneUpdatePayload = Partial<ShippingZoneCreatePayload>;

export const shippingZonesApi = {
  async list(params?: ShippingZoneListParams): Promise<{ data: ShippingZone[] }> {
    const res = await apiClient.get<ApiResponse<ShippingZone[] | { data: ShippingZone[] }>>('/vendor/settings/shipping-zones', { params });
    const raw = res.data.data;
    // Backend currently returns a plain array; accept either shape for safety.
    if (Array.isArray(raw)) return { data: raw };
    return { data: raw?.data ?? [] };
  },

  async get(id: number): Promise<ShippingZone> {
    const res = await apiClient.get<ApiResponse<ShippingZone>>(`/vendor/settings/shipping-zones/${id}`);
    return res.data.data!;
  },

  async create(data: ShippingZoneCreatePayload): Promise<ShippingZone> {
    const res = await apiClient.post<ApiResponse<ShippingZone>>('/vendor/settings/shipping-zones', data);
    return res.data.data!;
  },

  async update(id: number, data: ShippingZoneUpdatePayload): Promise<ShippingZone> {
    const res = await apiClient.put<ApiResponse<ShippingZone>>(`/vendor/settings/shipping-zones/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/settings/shipping-zones/${id}`);
  },
};

/* ── Payment Methods ──────────────────────────────────────────────────── */

export interface PaymentMethodUpdatePayload {
  name?: string;
  display_name?: string;
  description?: string | null;
  logo?: string | null;
  is_active?: boolean;
  settings?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  credentials?: Record<string, unknown> | null;
  sort_order?: number;
}

export const paymentMethodsApi = {
  async list(): Promise<PaymentMethod[]> {
    const res = await apiClient.get<ApiResponse<PaymentMethod[]>>('/vendor/settings/payment-methods');
    return res.data.data!;
  },

  async update(id: number, data: PaymentMethodUpdatePayload): Promise<PaymentMethod> {
    const res = await apiClient.put<ApiResponse<PaymentMethod>>(
      `/vendor/settings/payment-methods/${id}`,
      data
    );
    return res.data.data!;
  },
};

/* ── Delivery Partners ────────────────────────────────────────────────── */

export interface DeliveryPartnerUpdatePayload {
  is_active?: boolean;
  credentials?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
}

export const deliveryPartnersApi = {
  async list(): Promise<DeliveryPartner[]> {
    const res = await apiClient.get<ApiResponse<DeliveryPartner[]>>('/vendor/settings/delivery-partners');
    return res.data.data!;
  },

  async update(id: number, data: DeliveryPartnerUpdatePayload): Promise<DeliveryPartner> {
    const res = await apiClient.patch<ApiResponse<DeliveryPartner>>(
      `/vendor/settings/delivery-partners/${id}`,
      data
    );
    return res.data.data!;
  },
};

/* ── Tax Rules ────────────────────────────────────────────────────────── */

export interface TaxRuleListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
}

export interface TaxRuleCreatePayload {
  name: string;
  rate: number | string;
  region?: string | null;
  applies_to?: TaxRule['applies_to'];
  is_active?: boolean;
}

export type TaxRuleUpdatePayload = Partial<TaxRuleCreatePayload>;

export const taxRulesApi = {
  async list(params?: TaxRuleListParams): Promise<PaginatedResponse<TaxRule>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<TaxRule>>>('/vendor/settings/tax-rules', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<TaxRule> {
    const res = await apiClient.get<ApiResponse<TaxRule>>(`/vendor/settings/tax-rules/${id}`);
    return res.data.data!;
  },

  async create(data: TaxRuleCreatePayload): Promise<TaxRule> {
    const res = await apiClient.post<ApiResponse<TaxRule>>('/vendor/settings/tax-rules', data);
    return res.data.data!;
  },

  async update(id: number, data: TaxRuleUpdatePayload): Promise<TaxRule> {
    const res = await apiClient.put<ApiResponse<TaxRule>>(`/vendor/settings/tax-rules/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/settings/tax-rules/${id}`);
  },
};

/* ── Email Templates ──────────────────────────────────────────────────── */

export interface EmailTemplateUpdatePayload {
  name?: string;
  subject?: string;
  body?: string;
  is_active?: boolean;
}

export const emailTemplatesApi = {
  async list(): Promise<EmailTemplate[]> {
    const res = await apiClient.get<ApiResponse<EmailTemplate[]>>('/vendor/settings/email-templates');
    return res.data.data!;
  },

  async update(id: number, data: EmailTemplateUpdatePayload): Promise<EmailTemplate> {
    const res = await apiClient.put<ApiResponse<EmailTemplate>>(
      `/vendor/settings/email-templates/${id}`,
      data
    );
    return res.data.data!;
  },

  async resetToDefault(id: number): Promise<EmailTemplate> {
    const res = await apiClient.post<ApiResponse<EmailTemplate>>(
      `/vendor/settings/email-templates/${id}/reset`
    );
    return res.data.data!;
  },
};

export interface MetaPixelSettings {
  pixel_id: string | null;
  is_active: boolean;
  track_view_content: boolean;
  track_add_to_cart: boolean;
  track_initiate_checkout: boolean;
  track_purchase: boolean;
  use_conversions_api: boolean;
  test_event_code: string | null;
  has_access_token: boolean;
}

export const metaPixelApi = {
  async get(): Promise<MetaPixelSettings> {
    const res = await apiClient.get<ApiResponse<MetaPixelSettings>>('/vendor/settings/meta-pixel');
    return res.data.data!;
  },
  async update(data: Partial<MetaPixelSettings> & { access_token?: string }): Promise<MetaPixelSettings> {
    const res = await apiClient.patch<ApiResponse<MetaPixelSettings>>('/vendor/settings/meta-pixel', data);
    return res.data.data!;
  },
  async clearToken(): Promise<void> {
    await apiClient.delete('/vendor/settings/meta-pixel/token');
  },
};

export interface GoogleTagManagerSettings {
  gtm_id: string | null;
  is_active: boolean;
}

export const googleTagManagerApi = {
  async get(): Promise<GoogleTagManagerSettings> {
    const res = await apiClient.get<ApiResponse<GoogleTagManagerSettings>>('/vendor/settings/google-tag-manager');
    return res.data.data!;
  },
  async update(data: Partial<GoogleTagManagerSettings>): Promise<GoogleTagManagerSettings> {
    const res = await apiClient.patch<ApiResponse<GoogleTagManagerSettings>>('/vendor/settings/google-tag-manager', data);
    return res.data.data!;
  },
};
