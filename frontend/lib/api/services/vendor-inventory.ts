import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  Branch,
  InventoryLog,
  StockTransfer,
  Supplier,
  Product,
  PurchaseOrder,
} from '../types';

/* ── Branches ─────────────────────────────────────────────────────────── */

export interface BranchListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
}

export interface BranchCreatePayload {
  name: string;
  code?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  thana?: string | null;
  phone?: string | null;
  email?: string | null;
  is_main?: boolean;
  is_active?: boolean;
}

export type BranchUpdatePayload = Partial<BranchCreatePayload>;

export interface BranchStockItem {
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
  product?: Product;
}

export interface AdjustStockPayload {
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  type?: 'set' | 'increase' | 'decrease';
  reason?: string | null;
}

export const branchesApi = {
  async list(params?: BranchListParams): Promise<PaginatedResponse<Branch>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Branch>>>('/vendor/branches', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Branch> {
    const res = await apiClient.get<ApiResponse<Branch>>(`/vendor/branches/${id}`);
    return res.data.data!;
  },

  async create(data: BranchCreatePayload): Promise<Branch> {
    const res = await apiClient.post<ApiResponse<Branch>>('/vendor/branches', data);
    return res.data.data!;
  },

  async update(id: number, data: BranchUpdatePayload): Promise<Branch> {
    const res = await apiClient.put<ApiResponse<Branch>>(`/vendor/branches/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/branches/${id}`);
  },

  async setMain(id: number): Promise<Branch> {
    const res = await apiClient.post<ApiResponse<Branch>>(`/vendor/branches/${id}/set-main`);
    return res.data.data!;
  },

  async stock(
    id: number,
    params?: { page?: number; per_page?: number; search?: string; low_stock?: boolean }
  ): Promise<PaginatedResponse<BranchStockItem>> {
    // Map UI param names to the ones the backend expects (q, low_only).
    const apiParams = {
      page: params?.page,
      per_page: params?.per_page,
      q: params?.search,
      low_only: params?.low_stock,
    };
    const res = await apiClient.get<ApiResponse<PaginatedResponse<BranchStockItem>>>(
      `/vendor/branches/${id}/stock`,
      { params: apiParams }
    );
    return res.data.data!;
  },

  async adjustStock(id: number, data: AdjustStockPayload): Promise<BranchStockItem> {
    // Backend contract: POST /vendor/branches/{id}/stock/adjust
    // Body: {product_id, variant_id?, change_qty: signed int, note?}.
    // Frontend speaks: {product_id, variant_id?, quantity, type, reason?}
    // Convert 'set' to a signed delta by reading current stock first.
    let change_qty: number;
    if (data.type === 'set') {
      const current = await apiClient.get<ApiResponse<{ data: BranchStockItem[] }>>(
        `/vendor/branches/${id}/stock`,
        { params: { product_id: data.product_id, per_page: 100 } }
      );
      const rows = current.data.data?.data ?? [];
      const row = rows.find(r =>
        r.product_id === data.product_id &&
        (r.variant_id ?? null) === (data.variant_id ?? null)
      );
      const currentQty = row?.stock ?? 0;
      change_qty = data.quantity - currentQty;
      if (change_qty === 0) {
        return row ?? ({ product_id: data.product_id, variant_id: data.variant_id ?? null, stock: currentQty } as BranchStockItem);
      }
    } else if (data.type === 'decrease') {
      change_qty = -Math.abs(data.quantity);
    } else {
      change_qty = Math.abs(data.quantity);
    }

    const res = await apiClient.post<ApiResponse<{ stock: BranchStockItem }>>(
      `/vendor/branches/${id}/stock/adjust`,
      {
        product_id: data.product_id,
        variant_id: data.variant_id ?? null,
        change_qty,
        note: data.reason ?? null,
      }
    );
    return res.data.data!.stock;
  },
};

/* ── Inventory Logs ───────────────────────────────────────────────────── */

export interface InventoryLogListParams {
  page?: number;
  per_page?: number;
  product_id?: number;
  variant_id?: number;
  branch_id?: number;
  type?: InventoryLog['type'];
  date_from?: string;
  date_to?: string;
}

export const inventoryLogsApi = {
  async list(params?: InventoryLogListParams): Promise<PaginatedResponse<InventoryLog>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<InventoryLog>>>('/vendor/inventory-logs', { params });
    return res.data.data!;
  },
};

/* ── Stock Transfers ──────────────────────────────────────────────────── */

export interface StockTransferListParams {
  page?: number;
  per_page?: number;
  status?: StockTransfer['status'];
  from_branch_id?: number;
  to_branch_id?: number;
  search?: string;
}

export interface StockTransferCreatePayload {
  from_branch_id: number;
  to_branch_id: number;
  notes?: string | null;
  items: { product_id: number; variant_id?: number | null; quantity: number }[];
}

export type StockTransferUpdatePayload = Partial<StockTransferCreatePayload>;

export const stockTransfersApi = {
  async list(params?: StockTransferListParams): Promise<PaginatedResponse<StockTransfer>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<StockTransfer>>>('/vendor/stock-transfers', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<StockTransfer> {
    const res = await apiClient.get<ApiResponse<StockTransfer>>(`/vendor/stock-transfers/${id}`);
    return res.data.data!;
  },

  async create(data: StockTransferCreatePayload): Promise<StockTransfer> {
    const res = await apiClient.post<ApiResponse<StockTransfer>>('/vendor/stock-transfers', data);
    return res.data.data!;
  },

  async update(id: number, data: StockTransferUpdatePayload): Promise<StockTransfer> {
    const res = await apiClient.put<ApiResponse<StockTransfer>>(`/vendor/stock-transfers/${id}`, data);
    return res.data.data!;
  },

  async sendTransfer(id: number): Promise<StockTransfer> {
    const res = await apiClient.post<ApiResponse<StockTransfer>>(`/vendor/stock-transfers/${id}/send`);
    return res.data.data!;
  },

  async markReceived(
    id: number,
    data?: { items?: { id: number; quantity_received: number }[]; notes?: string }
  ): Promise<StockTransfer> {
    const res = await apiClient.post<ApiResponse<StockTransfer>>(
      `/vendor/stock-transfers/${id}/mark-received`,
      data || {}
    );
    return res.data.data!;
  },

  async cancel(id: number, reason?: string): Promise<StockTransfer> {
    const res = await apiClient.post<ApiResponse<StockTransfer>>(
      `/vendor/stock-transfers/${id}/cancel`,
      { reason }
    );
    return res.data.data!;
  },
};

/* ── Suppliers ────────────────────────────────────────────────────────── */

export interface SupplierListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
}

export interface SupplierCreatePayload {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export type SupplierUpdatePayload = Partial<SupplierCreatePayload>;

export const suppliersApi = {
  async list(params?: SupplierListParams): Promise<PaginatedResponse<Supplier>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<Supplier>>>('/vendor/suppliers', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<Supplier> {
    const res = await apiClient.get<ApiResponse<Supplier>>(`/vendor/suppliers/${id}`);
    return res.data.data!;
  },

  async create(data: SupplierCreatePayload): Promise<Supplier> {
    const res = await apiClient.post<ApiResponse<Supplier>>('/vendor/suppliers', data);
    return res.data.data!;
  },

  async update(id: number, data: SupplierUpdatePayload): Promise<Supplier> {
    const res = await apiClient.put<ApiResponse<Supplier>>(`/vendor/suppliers/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/suppliers/${id}`);
  },

  async orders(id: number, params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<PurchaseOrder>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>(
      `/vendor/suppliers/${id}/orders`,
      { params }
    );
    return res.data.data!;
  },
};
