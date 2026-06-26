import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  VendorSession,
  ApiKey,
  BillingInvoice,
  Plan,
} from '../types';

/* ── Security: Password + Sessions ────────────────────────────────────── */

export interface PasswordStatus {
  last_changed_at: string | null;
  password_strength: 'weak' | 'ok' | 'strong';
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export const securityApi = {
  async getPassword(): Promise<PasswordStatus> {
    const res = await apiClient.get<ApiResponse<PasswordStatus>>(
      '/vendor/settings/security/password'
    );
    return res.data.data!;
  },

  async changePassword(data: ChangePasswordPayload): Promise<void> {
    await apiClient.post<ApiResponse<null>>(
      '/vendor/settings/security/password',
      data
    );
  },

  async listSessions(): Promise<VendorSession[]> {
    const res = await apiClient.get<ApiResponse<VendorSession[]>>(
      '/vendor/settings/security/sessions'
    );
    return res.data.data!;
  },

  async revokeSession(tokenId: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(
      `/vendor/settings/security/sessions/${tokenId}`
    );
  },

  async revokeOtherSessions(): Promise<void> {
    await apiClient.post<ApiResponse<null>>(
      '/vendor/settings/security/sessions/revoke-others'
    );
  },
};

/* ── API Keys ─────────────────────────────────────────────────────────── */

export interface CreateApiKeyPayload {
  name: string;
  abilities?: string[];
}

export interface CreateApiKeyResponse {
  key: ApiKey;
  plaintext_token: string;
}

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    const res = await apiClient.get<ApiResponse<ApiKey[]>>(
      '/vendor/settings/api-keys'
    );
    return res.data.data!;
  },

  async create(data: CreateApiKeyPayload): Promise<CreateApiKeyResponse> {
    const res = await apiClient.post<ApiResponse<CreateApiKeyResponse>>(
      '/vendor/settings/api-keys',
      data
    );
    return res.data.data!;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(
      `/vendor/settings/api-keys/${id}`
    );
  },
};

/* ── Domain ───────────────────────────────────────────────────────────── */

export interface DnsRecord {
  type: string;
  host: string;
  value: string;
}

export interface DomainStatus {
  custom_domain: string | null;
  verification_status: 'pending' | 'verified' | 'failed' | null;
  dns_records: DnsRecord[];
  primary_subdomain: string;
}

export interface AttachDomainPayload {
  domain: string;
}

export const domainApi = {
  async get(): Promise<DomainStatus> {
    const res = await apiClient.get<ApiResponse<DomainStatus>>(
      '/vendor/settings/domain'
    );
    return res.data.data!;
  },

  async attach(data: AttachDomainPayload): Promise<DomainStatus> {
    const res = await apiClient.post<ApiResponse<DomainStatus>>(
      '/vendor/settings/domain/attach',
      data
    );
    return res.data.data!;
  },

  async verify(): Promise<DomainStatus> {
    const res = await apiClient.post<ApiResponse<DomainStatus>>(
      '/vendor/settings/domain/verify'
    );
    return res.data.data!;
  },

  async detach(): Promise<void> {
    await apiClient.delete<ApiResponse<null>>('/vendor/settings/domain');
  },
};

/* ── Billing ──────────────────────────────────────────────────────────── */

export interface BillingOverview {
  current_plan: Plan;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  invoices: BillingInvoice[];
}

export interface SubscribePayload {
  plan_slug: string;
  billing_cycle: 'monthly' | 'yearly';
}

export interface BillingInvoiceListParams {
  page?: number;
  per_page?: number;
}

export const billingApi = {
  async get(): Promise<BillingOverview> {
    const res = await apiClient.get<ApiResponse<BillingOverview>>(
      '/vendor/settings/billing'
    );
    return res.data.data!;
  },

  async subscribe(data: SubscribePayload): Promise<BillingOverview> {
    const res = await apiClient.post<ApiResponse<BillingOverview>>(
      '/vendor/settings/billing/subscribe',
      data
    );
    return res.data.data!;
  },

  async listInvoices(
    params?: BillingInvoiceListParams
  ): Promise<PaginatedResponse<BillingInvoice>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<BillingInvoice>>>(
      '/vendor/settings/billing/invoices',
      { params }
    );
    return res.data.data!;
  },

  async getInvoice(id: number | string): Promise<BillingInvoice> {
    const res = await apiClient.get<ApiResponse<BillingInvoice>>(
      `/vendor/settings/billing/invoices/${id}`
    );
    return res.data.data!;
  },
};
