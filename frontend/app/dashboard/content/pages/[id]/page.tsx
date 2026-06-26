'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Globe, ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { cmsPagesApi, CmsPageUpdatePayload, filesApi } from '@/lib/api/services/vendor-content';
import { getApiErrorMessage } from '@/lib/api/client';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CmsPageAboutSections } from '@/lib/api/types';

export default function PageEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = params.id === 'new';
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [sections, setSections] = useState<CmsPageAboutSections | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  const { data: page, isLoading } = useQuery({
    queryKey: ['vendor', 'cms-pages', params.id],
    queryFn: () => cmsPagesApi.get(Number(params.id)),
    enabled: !isNew,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content ?? '');
      setStatus(page.status);
      setSections(page.sections ?? null);
    }
  }, [page]);

  const isAbout = !isNew && (page?.slug === 'about' || slug === 'about');
  const storyImage = sections?.story?.story_image ?? null;

  const handleStoryImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const asset = await filesApi.upload(file, { folder: 'about' });
      setSections(prev => ({
        ...prev,
        story: { ...(prev?.story ?? {}), story_image: asset.url },
      }));
    } catch (err) {
      showBanner('error', getApiErrorMessage(err, 'Image upload failed'));
    } finally {
      setUploadingImg(false);
    }
  };

  const removeStoryImage = () => {
    setSections(prev => ({
      ...prev,
      story: { ...(prev?.story ?? {}), story_image: undefined },
    }));
  };

  const createMut = useMutation({
    mutationFn: (data: CmsPageUpdatePayload) => cmsPagesApi.create({
      title: data.title!,
      slug: data.slug,
      content: data.content,
      status: data.status,
    }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      router.replace(`/dashboard/content/pages/${created.id}`);
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to create page')),
  });

  const updateMut = useMutation({
    mutationFn: (data: CmsPageUpdatePayload) => cmsPagesApi.update(Number(params.id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages', params.id] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'cms-page', 'about'] });
      showBanner('success', 'Page saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save page')),
  });

  const publishMut = useMutation({
    mutationFn: () => cmsPagesApi.publish(Number(params.id)),
    onSuccess: (updated) => {
      setStatus(updated.status);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      showBanner('success', 'Page published');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to publish')),
  });

  const unpublishMut = useMutation({
    mutationFn: () => cmsPagesApi.unpublish(Number(params.id)),
    onSuccess: (updated) => {
      setStatus(updated.status);
      queryClient.invalidateQueries({ queryKey: ['vendor', 'cms-pages'] });
      showBanner('success', 'Page set to draft');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to unpublish')),
  });

  const handleSave = () => {
    const payload: CmsPageUpdatePayload = { title, slug, content, status, sections: sections as Record<string, unknown> ?? undefined };
    if (isNew) createMut.mutate(payload);
    else updateMut.mutate(payload);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (!isNew && isLoading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading...</div>;
  }

  const currentStatus = isNew ? status : (page?.status ?? status);

  return (
    <div className="max-w-[860px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/content/pages">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{isNew ? 'New Page' : (page?.title ?? 'Edit Page')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && currentStatus === 'published' && (
            <a href={`/${page?.slug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm"><Eye size={14} /> Preview</Button>
            </a>
          )}
          {!isNew && (
            currentStatus === 'published' ? (
              <Button variant="secondary" size="sm" onClick={() => unpublishMut.mutate()} disabled={unpublishMut.isPending}>
                Set to Draft
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                <Globe size={14} /> Publish
              </Button>
            )
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
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
        {/* Main content */}
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

          {/* Story image — only shown for the about page */}
          {isAbout && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Story Image</h2>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleStoryImageUpload(f);
                  e.target.value = '';
                }}
              />

              {storyImage ? (
                <div className="relative group">
                  <img
                    src={storyImage}
                    alt="Story"
                    className="w-full aspect-[4/3] object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-100 flex items-center gap-1.5"
                    >
                      <ImageIcon size={12} /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeStoryImage}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 flex items-center gap-1.5"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  disabled={uploadingImg}
                  className="w-full aspect-[4/3] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#2596be] hover:bg-[#2596be]/5 transition-colors group disabled:opacity-50"
                >
                  {uploadingImg ? (
                    <Loader2 size={24} className="text-gray-400 animate-spin" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-300 group-hover:text-[#2596be] transition-colors" />
                  )}
                  <span className="text-xs text-gray-400 group-hover:text-[#2596be] transition-colors">
                    {uploadingImg ? 'Uploading...' : 'Click to upload story image'}
                  </span>
                  <span className="text-[10px] text-gray-300">JPG, PNG, WebP — recommended 4:3 ratio</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
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

          {!isNew && page && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Info</h2>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(page.created_at).toLocaleDateString()}</p>
                {page.published_at && <p>Published: {new Date(page.published_at).toLocaleDateString()}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
