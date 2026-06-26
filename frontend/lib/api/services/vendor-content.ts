import { apiClient, type ApiResponse, type PaginatedResponse } from '../client';
import type {
  BlogPost,
  BlogCategory,
  CmsPage,
  NavigationMenu,
  NavigationMenuItem,
  UrlRedirect,
  FileAsset,
} from '../types';

/* ── Blog Posts ───────────────────────────────────────────────────────── */

export interface BlogPostListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  status?: BlogPost['status'];
  featured?: boolean;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface BlogPostCreatePayload {
  category_id?: number | null;
  title: string;
  slug?: string;
  excerpt?: string | null;
  body?: string | null;
  featured_image?: string | null;
  author_name?: string | null;
  tags?: string[];
  meta_title?: string | null;
  meta_description?: string | null;
  status?: BlogPost['status'];
  featured?: boolean;
  published_at?: string | null;
}

export type BlogPostUpdatePayload = Partial<BlogPostCreatePayload>;

export const blogPostsApi = {
  async list(params?: BlogPostListParams): Promise<PaginatedResponse<BlogPost>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<BlogPost>>>('/vendor/blog/posts', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<BlogPost> {
    const res = await apiClient.get<ApiResponse<BlogPost>>(`/vendor/blog/posts/${id}`);
    return res.data.data!;
  },

  async create(data: BlogPostCreatePayload): Promise<BlogPost> {
    const res = await apiClient.post<ApiResponse<BlogPost>>('/vendor/blog/posts', data);
    return res.data.data!;
  },

  async update(id: number, data: BlogPostUpdatePayload): Promise<BlogPost> {
    const res = await apiClient.put<ApiResponse<BlogPost>>(`/vendor/blog/posts/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/blog/posts/${id}`);
  },

  async publish(id: number, published_at?: string): Promise<BlogPost> {
    const res = await apiClient.post<ApiResponse<BlogPost>>(`/vendor/blog/posts/${id}/publish`, {
      published_at,
    });
    return res.data.data!;
  },

  async unpublish(id: number): Promise<BlogPost> {
    const res = await apiClient.post<ApiResponse<BlogPost>>(`/vendor/blog/posts/${id}/unpublish`);
    return res.data.data!;
  },

  async toggleFeatured(id: number): Promise<BlogPost> {
    const res = await apiClient.post<ApiResponse<BlogPost>>(`/vendor/blog/posts/${id}/toggle-featured`);
    return res.data.data!;
  },
};

/* ── Blog Categories ──────────────────────────────────────────────────── */

export interface BlogCategoryListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface BlogCategoryCreatePayload {
  name: string;
  slug?: string;
  description?: string | null;
}

export type BlogCategoryUpdatePayload = Partial<BlogCategoryCreatePayload>;

export const blogCategoriesApi = {
  async list(params?: BlogCategoryListParams): Promise<{ data: BlogCategory[] }> {
    const res = await apiClient.get<ApiResponse<BlogCategory[] | { data: BlogCategory[] }>>(
      '/vendor/blog/categories',
      { params }
    );
    const raw = res.data.data;
    if (Array.isArray(raw)) return { data: raw };
    return { data: raw?.data ?? [] };
  },

  async get(id: number): Promise<BlogCategory> {
    const res = await apiClient.get<ApiResponse<BlogCategory>>(`/vendor/blog/categories/${id}`);
    return res.data.data!;
  },

  async create(data: BlogCategoryCreatePayload): Promise<BlogCategory> {
    const res = await apiClient.post<ApiResponse<BlogCategory>>('/vendor/blog/categories', data);
    return res.data.data!;
  },

  async update(id: number, data: BlogCategoryUpdatePayload): Promise<BlogCategory> {
    const res = await apiClient.put<ApiResponse<BlogCategory>>(`/vendor/blog/categories/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/blog/categories/${id}`);
  },
};

/* ── CMS Pages ────────────────────────────────────────────────────────── */

export interface CmsPageListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CmsPage['status'];
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CmsPageCreatePayload {
  title: string;
  slug?: string;
  content?: string | null;
  body?: string | null;
  sections?: Record<string, unknown> | null;
  meta_title?: string | null;
  meta_description?: string | null;
  status?: CmsPage['status'];
  template?: string | null;
  published_at?: string | null;
}

export type CmsPageUpdatePayload = Partial<CmsPageCreatePayload>;

export const cmsPagesApi = {
  async list(params?: CmsPageListParams): Promise<PaginatedResponse<CmsPage>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<CmsPage>>>('/vendor/cms-pages', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<CmsPage> {
    const res = await apiClient.get<ApiResponse<CmsPage>>(`/vendor/cms-pages/${id}`);
    return res.data.data!;
  },

  async create(data: CmsPageCreatePayload): Promise<CmsPage> {
    const res = await apiClient.post<ApiResponse<CmsPage>>('/vendor/cms-pages', data);
    return res.data.data!;
  },

  async update(id: number, data: CmsPageUpdatePayload): Promise<CmsPage> {
    const res = await apiClient.put<ApiResponse<CmsPage>>(`/vendor/cms-pages/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/cms-pages/${id}`);
  },

  async publish(id: number, published_at?: string): Promise<CmsPage> {
    const res = await apiClient.post<ApiResponse<CmsPage>>(`/vendor/cms-pages/${id}/publish`, {
      published_at,
    });
    return res.data.data!;
  },

  async unpublish(id: number): Promise<CmsPage> {
    const res = await apiClient.post<ApiResponse<CmsPage>>(`/vendor/cms-pages/${id}/unpublish`);
    return res.data.data!;
  },
};

/* ── Navigation Menus ─────────────────────────────────────────────────── */

export interface NavigationMenuListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface NavigationMenuCreatePayload {
  name: string;
  handle: string;
  items?: NavigationMenuItem[];
}

export type NavigationMenuUpdatePayload = Partial<NavigationMenuCreatePayload>;

export const navigationMenusApi = {
  async list(params?: NavigationMenuListParams): Promise<{ data: NavigationMenu[] }> {
    const res = await apiClient.get<ApiResponse<NavigationMenu[] | { data: NavigationMenu[] }>>(
      '/vendor/navigation-menus',
      { params }
    );
    const raw = res.data.data;
    if (Array.isArray(raw)) return { data: raw };
    return { data: raw?.data ?? [] };
  },

  async get(id: number): Promise<NavigationMenu> {
    const res = await apiClient.get<ApiResponse<NavigationMenu>>(`/vendor/navigation-menus/${id}`);
    return res.data.data!;
  },

  async create(data: NavigationMenuCreatePayload): Promise<NavigationMenu> {
    const res = await apiClient.post<ApiResponse<NavigationMenu>>('/vendor/navigation-menus', data);
    return res.data.data!;
  },

  async update(id: number, data: NavigationMenuUpdatePayload): Promise<NavigationMenu> {
    const res = await apiClient.put<ApiResponse<NavigationMenu>>(`/vendor/navigation-menus/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/navigation-menus/${id}`);
  },
};

/* ── URL Redirects ────────────────────────────────────────────────────── */

export interface UrlRedirectListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface UrlRedirectCreatePayload {
  from_path: string;
  to_path: string;
  status_code?: 301 | 302;
}

export type UrlRedirectUpdatePayload = Partial<UrlRedirectCreatePayload>;

export const urlRedirectsApi = {
  async list(params?: UrlRedirectListParams): Promise<PaginatedResponse<UrlRedirect>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<UrlRedirect>>>('/vendor/url-redirects', { params });
    return res.data.data!;
  },

  async get(id: number): Promise<UrlRedirect> {
    const res = await apiClient.get<ApiResponse<UrlRedirect>>(`/vendor/url-redirects/${id}`);
    return res.data.data!;
  },

  async create(data: UrlRedirectCreatePayload): Promise<UrlRedirect> {
    const res = await apiClient.post<ApiResponse<UrlRedirect>>('/vendor/url-redirects', data);
    return res.data.data!;
  },

  async update(id: number, data: UrlRedirectUpdatePayload): Promise<UrlRedirect> {
    const res = await apiClient.put<ApiResponse<UrlRedirect>>(`/vendor/url-redirects/${id}`, data);
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/url-redirects/${id}`);
  },

  async import(file: File): Promise<{ imported: number; failed: number; errors?: string[] }> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<ApiResponse<{ imported: number; failed: number; errors?: string[] }>>(
      '/vendor/url-redirects/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data!;
  },
};

/* ── Files ────────────────────────────────────────────────────────────── */

export interface FileListParams {
  page?: number;
  per_page?: number;
  search?: string;
  folder?: string;
  mime_type?: string;
}

export interface FileUploadFields {
  alt?: string;
  folder?: string;
}

export interface FileUpdatePayload {
  name?: string;
  alt?: string | null;
  folder?: string | null;
}

export const filesApi = {
  async list(params?: FileListParams): Promise<PaginatedResponse<FileAsset>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<FileAsset>>>('/vendor/files', { params });
    return res.data.data!;
  },

  async upload(file: File, fields: FileUploadFields = {}): Promise<FileAsset> {
    const form = new FormData();
    form.append('file', file);
    if (fields.alt) form.append('alt', fields.alt);
    if (fields.folder) form.append('folder', fields.folder);
    const res = await apiClient.post<ApiResponse<FileAsset>>('/vendor/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data!;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/vendor/files/${id}`);
  },

  async update(id: number, data: FileUpdatePayload): Promise<FileAsset> {
    const res = await apiClient.put<ApiResponse<FileAsset>>(`/vendor/files/${id}`, data);
    return res.data.data!;
  },

  async bulkDelete(ids: number[]): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/vendor/files/bulk-delete', { ids });
  },
};
