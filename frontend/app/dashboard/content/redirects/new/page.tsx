'use client';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { urlRedirectsApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";

export default function AddRedirectPage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [error, setError] = useState('');

  const canSave = from.trim().length > 0 && to.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: () => urlRedirectsApi.create({ from_path: from.trim(), to_path: to.trim(), status_code: 301 }),
    onSuccess: () => router.push('/dashboard/content/redirects'),
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to create redirect')),
  });

  const handleSave = () => {
    setError('');
    createMutation.mutate();
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-8">
        <Link href="/dashboard/content/redirects" className="hover:text-gray-900 transition-colors">URL redirects</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Create URL redirect</span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Redirect from */}
      <div className="grid grid-cols-[260px_1fr] gap-6 mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1.5">Redirect from</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            The original URL that you'd like to forward visitors from. Usually, this is an old page
            the visitors can no longer access because the content was moved to a different URL or deleted.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Redirect from</label>
          <input
            type="text"
            value={from}
            onChange={e => setFrom(e.target.value)}
            placeholder="e.g., /shop/shoes"
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Redirect to */}
      <div className="grid grid-cols-[260px_1fr] gap-6 mb-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1.5">Redirect to</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            The new URL that visitors should be forwarded to. If you want to redirect to your store's
            homepage, enter / (a forward slash).
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Redirect to</label>
          <input
            type="text"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="Type or paste a link"
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard/content/redirects">
          <Button variant="secondary" size="sm">Cancel</Button>
        </Link>
        <Button size="sm" disabled={!canSave || createMutation.isPending} onClick={handleSave}>
          {createMutation.isPending ? 'Saving...' : 'Save redirect'}
        </Button>
      </div>

      {/* Learn more */}
      <p className="text-xs text-gray-400 text-center mt-8">
        Learn more about{' '}
        <span>creating a URL redirect</span>
      </p>
    </div>
  );
}
