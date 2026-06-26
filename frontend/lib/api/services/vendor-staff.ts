import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { Staff } from '../types';

/* ── Vendor Staff ─────────────────────────────────────────────────────── */

export interface StaffListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  active?: boolean;
}

export interface StaffInvitePayload {
  name: string;
  email?: string | null;
  phone: string;
  role: string;
  permissions?: string[];
  branch_ids?: number[] | null;
  password?: string;
  send_credentials?: boolean;
}

export interface StaffUpdatePayload {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  permissions?: string[];
  branch_ids?: number[] | null;
  active?: boolean;
  password?: string;
}

export const vendorStaffApi = {
  async list(params?: StaffListParams): Promise<PaginatedResponse<Staff>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Staff>>>('/vendor/staff', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Staff> {
    const res = await apiClient.get<ApiResponse<Staff>>(`/vendor/staff/${id}`);
    return res.data.data!;
  },

  async invite(data: StaffInvitePayload): Promise<Staff> {
    const res = await apiClient.post<ApiResponse<Staff>>('/vendor/staff', data);
    return res.data.data!;
  },

  async update(id: number, data: StaffUpdatePayload): Promise<Staff> {
    const res = await apiClient.patch<ApiResponse<Staff>>(`/vendor/staff/${id}`, data);
    return res.data.data!;
  },

  async destroy(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/staff/${id}`);
  },

  async resendInvite(id: number): Promise<void> {
    await apiClient.post<ApiResponse<null>>(`/vendor/staff/${id}/resend-invite`);
  },
};
