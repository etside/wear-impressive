import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type { Customer } from '../types';

export interface LoyaltyConfig {
  id: number;
  store_id: number;
  is_active: boolean;
  spend_amount_for_points: string;
  points_per_spend: number;
  redemption_value: string;
  min_redemption_points: number;
  points_expiry_days: number | null;
  welcome_bonus_points: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyAccount {
  id: number;
  store_id: number;
  customer_id: number;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  expires_at: string | null;
  created_at: string;
  customer?: Customer;
}

export interface LoyaltyTransaction {
  id: number;
  loyalty_account_id: number;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  reason: string;
  created_at: string;
}

export type LoyaltyConfigUpdatePayload = Partial<{
  is_active: boolean;
  spend_amount_for_points: number;
  points_per_spend: number;
  redemption_value: number;
  min_redemption_points: number;
  points_expiry_days: number | null;
  welcome_bonus_points: number;
}>;

export interface LoyaltyAdjustPayload {
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  reason: string;
}

export const loyaltyApi = {
  async getConfig(): Promise<LoyaltyConfig> {
    const res = await apiClient.get<ApiResponse<LoyaltyConfig>>('/vendor/loyalty/config');
    return res.data.data!;
  },

  async updateConfig(data: LoyaltyConfigUpdatePayload): Promise<LoyaltyConfig> {
    const res = await apiClient.patch<ApiResponse<LoyaltyConfig>>('/vendor/loyalty/config', data);
    return res.data.data!;
  },

  async listAccounts(params?: { search?: string; page?: number; per_page?: number }): Promise<PaginatedResponse<LoyaltyAccount>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<LoyaltyAccount>>>('/vendor/loyalty/accounts', { params });
    return res.data.data!;
  },

  async getAccount(customerId: number): Promise<{ account: LoyaltyAccount; transactions: LoyaltyTransaction[] }> {
    const res = await apiClient.get<ApiResponse<{ account: LoyaltyAccount; transactions: LoyaltyTransaction[] }>>(`/vendor/loyalty/accounts/${customerId}`);
    return res.data.data!;
  },

  async adjust(customerId: number, data: LoyaltyAdjustPayload): Promise<LoyaltyAccount> {
    const res = await apiClient.post<ApiResponse<LoyaltyAccount>>(`/vendor/loyalty/accounts/${customerId}/adjust`, data);
    return res.data.data!;
  },
};
