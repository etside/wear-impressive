import { apiClient, setAuthToken, clearAuthToken, type ApiResponse } from '../client';
import type { Vendor, Store, AuthResponse } from '../types';

export interface VendorLoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export const vendorAuthApi = {
  async login(data: VendorLoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/vendor/login', data);
    const auth = res.data.data!;
    if (auth.token) setAuthToken('vendor', auth.token);
    return auth;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/vendor/logout');
    } finally {
      clearAuthToken('vendor');
    }
  },

  async me(): Promise<{ vendor: Vendor; store: Store }> {
    const res = await apiClient.get<ApiResponse<{ vendor: Vendor; store: Store }>>('/vendor/me');
    return res.data.data!;
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/vendor/forgot-password', { email });
    return res.data.message || 'Reset link sent.';
  },

  async resetPassword(data: { email: string; password: string; password_confirmation: string; token: string }): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/vendor/reset-password', data);
    return res.data.message || 'Password reset successful.';
  },
};
