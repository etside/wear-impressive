'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { cmsPagesApi } from '@/lib/api/services/vendor-content';
import { getApiErrorMessage } from '@/lib/api/client';

function StatusBadge({ status }: { status: 'published' | 'draft' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      status === 'published'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}

export default function PagesListPage() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'cms-pages'],
    queryFn: () => cmsPagesApi.list({ per_page: 100 }),
  });
  const pages = data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: number) => cmsPagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      showBanner('success', 'Page deleted');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete')),
  });

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your storefront pages</p>
        </div>
        <Link href="/dashboard/content/pages/new">
          <Button size="sm"><Plus size={14} /> Add Page</Button>
        </Link>
      </div>

      {banner && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No pages yet</p>
            <p className="text-xs text-gray-400 mb-4">Create your first page</p>
            <Link href="/dashboard/content/pages/new">
              <Button size="sm"><Plus size={14} /> Add Page</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map(page => (
                <tr key={page.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/content/pages/${page.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">/{page.slug}</td>
                  <td className="px-4 py-3"><StatusBadge status={page.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/content/pages/${page.id}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil size={13} />
                        </button>
                      </Link>
                      <button
                        onClick={() => { if (confirm(`Delete "${page.title}"?`)) deleteMut.mutate(page.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
