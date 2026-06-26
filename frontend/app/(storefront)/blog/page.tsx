'use client';
import { useShopBase } from '@/lib/use-shop-base';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Clock, Eye, BookOpen, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { publicBlogApi } from '@/lib/api/services/storefront';
import type { BlogPost } from '@/lib/api/types';

function readingTimeOf(post: BlogPost): number {
  const text = `${post.title} ${post.excerpt ?? ''} ${post.body ?? ''}`;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function BlogCard({ post }: { post: BlogPost }) {
  const __sb = useShopBase();

  const categoryColor = '#6B7280';
  const categoryName = post.category?.name ?? 'Uncategorized';
  const reading = readingTimeOf(post);
  const publishedAt = post.published_at || post.created_at;

  return (
    <Link href={`${__sb}/blog/${post.slug}`} className="group block">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center relative">
          {post.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={32} className="text-gray-300" />
          )}
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: categoryColor }}>
              {categoryName}
            </span>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors">
            {post.title}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">{post.excerpt}</p>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><Clock size={11} /> {reading} min read</span>
            {publishedAt && (
              <span className="ml-auto">{new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StoreBlogPage() {
  const __sb = useShopBase();


  const [search, setSearch] = useState('');
  const [selectedCatSlug, setSelectedCatSlug] = useState<string>('all');
  const [sort, setSort] = useState<'latest'>('latest');

  const categoriesQuery = useQuery({
    queryKey: ['storefront', 'blog', 'categories'],
    queryFn: () => publicBlogApi.categories(),
  });

  const postsQuery = useQuery({
    queryKey: ['storefront', 'blog', 'posts', { search, category: selectedCatSlug }],
    queryFn: () => publicBlogApi.list({
      search: search.trim() || undefined,
      category_slug: selectedCatSlug === 'all' ? undefined : selectedCatSlug,
      per_page: 24,
    }),
    placeholderData: keepPreviousData,
  });

  const featuredQuery = useQuery({
    queryKey: ['storefront', 'blog', 'posts', { featured: true }],
    queryFn: () => publicBlogApi.list({ featured: true, per_page: 1 }),
  });

  const categories = categoriesQuery.data ?? [];
  const posts = postsQuery.data?.data ?? [];
  const featured = featuredQuery.data?.data?.[0];

  const visiblePosts = useMemo(() => posts, [posts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BookOpen size={20} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Blog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Tips, Trends & Insights</h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">Stories and guides to help you discover great products and grow your style</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Featured post */}
        {featured && selectedCatSlug === 'all' && !search && (
          <Link href={`${__sb}/blog/${featured.slug}`} className="group block mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-[16/9] md:aspect-auto bg-gray-100 flex items-center justify-center min-h-[220px]">
                  {featured.featured_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.featured_image} alt={featured.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={48} className="text-gray-300" />
                  )}
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-gray-500">
                      {featured.category?.name ?? 'Uncategorized'}
                    </span>
                    <Badge variant="warning" className="text-[10px]">Featured</Badge>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {readingTimeOf(featured)} min read</span>
                    {featured.published_at && (
                      <span>{new Date(featured.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-semibold text-gray-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read article <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCatSlug('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCatSlug === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCatSlug(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCatSlug === cat.slug
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 sm:flex-initial sm:w-56">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="bg-transparent text-sm outline-none w-full" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as 'latest')}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 outline-none">
              <option value="latest">Latest</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {postsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visiblePosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visiblePosts.map(post => <BlogCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No posts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
