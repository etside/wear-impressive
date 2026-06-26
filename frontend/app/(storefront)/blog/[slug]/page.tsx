'use client';
import { useShopBase } from '@/lib/use-shop-base';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Calendar, Tag, Copy, Check, Image as ImageIcon, BookOpen } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { publicBlogApi } from '@/lib/api/services/storefront';
import type { BlogPost } from '@/lib/api/types';

function readingTimeOf(post: BlogPost): number {
  const text = `${post.title} ${post.excerpt ?? ''} ${post.body ?? ''}`;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogDetailPage() {
  const __sb = useShopBase();


  const params = useParams();
  const slug = params.slug as string;
  const [copied, setCopied] = useState(false);

  const postQuery = useQuery({
    queryKey: ['storefront', 'blog', 'post', slug],
    queryFn: () => publicBlogApi.get(slug),
    enabled: !!slug,
  });

  const relatedQuery = useQuery({
    queryKey: ['storefront', 'blog', 'posts', { category: postQuery.data?.category?.slug, excludeSlug: slug }],
    queryFn: () => publicBlogApi.list({
      category_slug: postQuery.data!.category!.slug,
      per_page: 4,
    }),
    enabled: !!postQuery.data?.category?.slug,
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (postQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading post...</p>
      </div>
    );
  }

  const post = postQuery.data;

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Post not found</h1>
          <p className="text-sm text-gray-400 mb-4">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={`${__sb}/blog`}><Button size="sm"><ArrowLeft size={14} /> Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  const related = (relatedQuery.data?.data ?? []).filter(p => p.slug !== slug).slice(0, 3);
  const reading = readingTimeOf(post);
  const publishedAt = post.published_at || post.created_at;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="bg-gray-200 h-48 sm:h-64 flex items-center justify-center overflow-hidden">
        {post.featured_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={48} className="text-gray-400" />
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Back + meta */}
            <div className="flex items-center justify-between mb-6">
              <Link href={`${__sb}/blog`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                <ArrowLeft size={13} /> Back to Blog
              </Link>
              <button onClick={copyLink} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                {copied ? <><Check size={13} className="text-green-500" /> Copied!</> : <><Copy size={13} /> Share</>}
              </button>
            </div>

            {/* Category + reading info */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {post.category && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-white bg-gray-500">
                  {post.category.name}
                </span>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {reading} min read</span>
              {publishedAt && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={12} /> {new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">{post.title}</h1>

            {/* Author */}
            {post.author_name && (
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                  {post.author_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{post.author_name}</p>
                  <p className="text-[11px] text-gray-400">Author</p>
                </div>
              </div>
            )}

            {/* Content */}
            {post.body && (
              <div
                className="prose prose-sm prose-gray max-w-none
                  prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                  prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4
                  prose-ul:text-gray-600 prose-li:mb-1
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
              />
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag size={13} className="text-gray-400" />
                  {post.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-[11px] font-medium text-gray-600 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-10 mb-12">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Related Posts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map(r => (
                <Link key={r.id} href={`${__sb}/blog/${r.slug}`} className="group block">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center overflow-hidden">
                      {r.featured_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.featured_image} alt={r.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-600 transition-colors mb-1">
                        {r.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{readingTimeOf(r)} min</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
