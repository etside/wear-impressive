import axios, { type AxiosInstance, type AxiosError } from 'axios';

/**
 * Axios API client for eTommerce Laravel backend.
 * Attaches Sanctum token from localStorage, handles 401 by clearing auth.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/* ── Token management ─────────────────────────────────────────────────── */
const TOKEN_KEYS = {
  vendor: 'etommerce_vendor_token',
  customer: 'etommerce_customer_token',
  staff: 'etommerce_staff_token',
  super_admin: 'etommerce_super_admin_token',
} as const;

export type UserType = keyof typeof TOKEN_KEYS;

export function setAuthToken(userType: UserType, token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEYS[userType], token);
  }
}

export function getAuthToken(userType: UserType): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS[userType]);
}

export function clearAuthToken(userType: UserType) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEYS[userType]);
  }
}

export function clearAllTokens() {
  (Object.keys(TOKEN_KEYS) as UserType[]).forEach(clearAuthToken);
}

/* ── Request interceptor: attach token ────────────────────────────────── */
apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const url = config.url || '';
  let token: string | null = null;

  // Determine which token to use based on URL
  if (url.startsWith('/admin/') || url.startsWith('admin/') || url === '/admin' || url === 'admin') {
    token = getAuthToken('super_admin');
  } else if (url.startsWith('/vendor/') || url.startsWith('vendor/')) {
    token = getAuthToken('vendor');
  } else if (
    url.startsWith('/customer/') || url.startsWith('customer/') ||
    // Storefront endpoints aren't auth-required, but if a customer is
    // logged in we still want the request to be treated as authed (so the
    // backend can use auth('customer')->user() for cart, checkout, etc.).
    url.startsWith('/store/') || url.startsWith('store/')
  ) {
    token = getAuthToken('customer');
  } else if (url.startsWith('/staff/') || url.startsWith('staff/')) {
    token = getAuthToken('staff');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ── Response interceptor: handle errors ──────────────────────────────── */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (error.response?.status === 401) {
      // Clear relevant token on 401
      const url = error.config?.url || '';
      if (url.startsWith('/admin/') || url.startsWith('admin/') || url === '/admin' || url === 'admin') {
        clearAuthToken('super_admin');
        if (typeof window !== 'undefined' && !url.includes('/login') && !url.includes('/forgot-password') && !url.includes('/reset-password')) {
          window.location.href = '/admin/login';
        }
      } else if (url.startsWith('/vendor/') || url.startsWith('vendor/')) {
        clearAuthToken('vendor');
        if (typeof window !== 'undefined' && !url.includes('/login') && !url.includes('/register')) {
          window.location.href = '/login';
        }
      } else if (url.startsWith('/customer/') || url.startsWith('customer/')) {
        clearAuthToken('customer');
      }
    }
    return Promise.reject(error);
  }
);

/* ── Helper: extract error message ────────────────────────────────────── */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    // For 422 validation failures, prefer the specific field error over the
    // generic top-level "Validation failed." message so users see what to fix.
    if (error.response?.status === 422 && data?.errors) {
      const firstError = Object.values(data.errors)[0]?.[0];
      if (firstError) return firstError;
    }
    if (data?.message) return data.message;
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0]?.[0];
      if (firstError) return firstError;
    }
    return error.message || fallback;
  }
  return fallback;
}

/* ── Helper: wrap response ────────────────────────────────────────────── */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}
