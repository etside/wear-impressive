import { apiClient, setAuthToken, clearAuthToken, type ApiResponse } from '../client';
import type { Customer, AuthResponse } from '../types';

export interface CustomerRegisterPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  store_id?: number;
}

export interface CustomerLoginPayload {
  email?: string;
  phone?: string;
  password: string;
  remember?: boolean;
  store_id?: number;
}

export interface CustomerForgotPasswordPayload {
  email?: string;
  phone?: string;
  store_id?: number;
}

export interface CustomerResetPasswordPayload {
  email?: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  token: string;
  store_id?: number;
}

export interface CustomerProfileUpdatePayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  avatar?: string | null;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export const customerAuthApi = {
  async register(data: CustomerRegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/customer/register', data);
    const auth = res.data.data!;
    if (auth.token) setAuthToken('customer', auth.token);
    return auth;
  },

  async login(data: CustomerLoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/customer/login', data);
    const auth = res.data.data!;
    if (auth.token) setAuthToken('customer', auth.token);
    return auth;
  },

  /**
   * Lightweight phone-existence check for the checkout's "create an account"
   * toggle. Returns false for malformed numbers — the caller debounces and
   * skips the call until the customer has typed a full BD-format number.
   */
  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    const res = await apiClient.post<ApiResponse<{ exists: boolean }>>('/customer/check-phone', { phone });
    return res.data.data ?? { exists: false };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/customer/logout');
    } finally {
      clearAuthToken('customer');
    }
  },

  async me(): Promise<{ customer: Customer }> {
    const res = await apiClient.get<ApiResponse<{ customer: Customer }>>('/customer/me');
    return res.data.data!;
  },

  async updateProfile(data: CustomerProfileUpdatePayload): Promise<{ customer: Customer }> {
    const res = await apiClient.patch<ApiResponse<{ customer: Customer }>>('/customer/me', data);
    return res.data.data!;
  },

  async forgotPassword(data: CustomerForgotPasswordPayload): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/customer/forgot-password', data);
    return res.data.message || 'Reset link sent.';
  },

  async resetPassword(data: CustomerResetPasswordPayload): Promise<string> {
    const res = await apiClient.post<ApiResponse<null>>('/customer/reset-password', data);
    return res.data.message || 'Password reset successful.';
  },
};
