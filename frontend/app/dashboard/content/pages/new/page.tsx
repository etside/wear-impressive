'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cmsPagesApi, CmsPageCreatePayload } from '@/lib/api/services/vendor-content';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api/client';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

export default function NewPagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  const createMut = useMutation({
    mutationFn: (data: CmsPageCreatePayload) => cmsPagesApi.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      router.replace(`/dashboard/content/pages/${created.id}`);
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to create page')),
  });

  const handleSave = () => {
    if (!title.trim()) { showBanner('error', 'Title is required'); return; }
    createMut.mutate({ title, slug: slug || undefined, content, status });
  };

  return (
    <div className="max-w-[860px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/content/pages">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">New Page</h1>
        <Button size="sm" onClick={handleSave} disabled={createMut.isPending}>
          {createMut.isPending ? 'Creating...' : 'Create'}
        </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Page title"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2596be]/30 focus:border-[#2596be]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Start writing your page content..."
                minHeight="360px"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Visibility</h2>
            <div className="flex gap-2">
              {(['published', 'draft'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    status === s
                      ? 'border-[#2596be] bg-[#2596be]/10 text-[#2596be]'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s === 'published' ? 'Published' : 'Draft'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">URL</h2>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Slug</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#2596be]/30 focus-within:border-[#2596be]">
                <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-2 shrink-0">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="page-slug"
                  className="flex-1 px-2 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Leave blank to auto-generate from title</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
