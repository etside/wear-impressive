'use client';
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Trash2, Search, Upload, Globe, X, Check } from "lucide-react";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { urlRedirectsApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";

export default function RedirectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'url-redirects', { search }],
    queryFn: () => urlRedirectsApi.list({ per_page: 100, search: search || undefined }),
  });
  const redirects = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'url-redirects'] });

  const createMutation = useMutation({
    mutationFn: ({ from_path, to_path }: { from_path: string; to_path: string }) =>
      urlRedirectsApi.create({ from_path, to_path, status_code: 301 }),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => urlRedirectsApi.delete(id),
    onSuccess: () => { invalidate(); showBanner('success', 'Redirect deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete')),
  });

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.length} redirect(s)?`)) return;
    try {
      await Promise.all(selected.map(id => urlRedirectsApi.delete(id)));
      setSelected([]);
      invalidate();
      showBanner('success', 'Redirects deleted');
    } catch (err) {
      showBanner('error', getApiErrorMessage(err, 'Failed to delete'));
    }
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => urlRedirectsApi.import(file),
    onSuccess: (res) => {
      invalidate();
      setShowImport(false);
      setImportText('');
      setImportFile(null);
      showBanner('success', `Imported ${res.imported}. Failed: ${res.failed}`);
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to import')),
  });

  const filtered = redirects.filter(r =>
    r.from_path.includes(search) || r.to_path.includes(search)
  );

  const allSelected = filtered.length > 0 && filtered.every(r => selected.includes(r.id));

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleImport = async () => {
    if (importFile) {
      importMutation.mutate(importFile);
      return;
    }
    // Fallback: use paste text, create entries one-by-one via API
    const lines = importText.trim().split('\n').filter(l => l.includes(','));
    let success = 0;
    let fail = 0;
    for (const line of lines) {
      const [from, to] = line.split(',').map(s => s.trim());
      if (!from || !to) { fail++; continue; }
      try {
        await createMutation.mutateAsync({ from_path: from, to_path: to });
        success++;
      } catch {
        fail++;
      }
    }
    setShowImport(false);
    setImportText('');
    showBanner('success', `Imported ${success}. Failed: ${fail}`);
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">URL Redirects</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import URL Redirects
          </Button>
          <Link href="/dashboard/content/redirects/new">
            <Button size="sm">
              <Plus size={14} /> Create URL Redirect
            </Button>
          </Link>
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

      <div className="bg-white border border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
        ) : redirects.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center px-4">
            <div className="relative mb-5">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-14 h-14 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center">
                  <div className="flex items-center gap-0.5">
                    <Globe size={16} className="text-green-600" />
                    <span className="text-[11px] font-bold text-gray-700">WWW</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Manage your URL redirects</p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">
              Prevent old links from breaking by redirecting your customers to another page.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                <Upload size={14} /> Import URL redirects
              </Button>
              <Link href="/dashboard/content/redirects/new">
                <Button size="sm"><Plus size={14} /> Create URL redirect</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search redirects…"
                  className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
              </div>
              {selected.length > 0 && (
                <button onClick={bulkDelete}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-800 ml-auto">
                  <Trash2 size={13} /> Delete {selected.length}
                </button>
              )}
            </div>

            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : filtered.map(r => r.id))}
                      className="rounded accent-black" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Redirect from</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Redirect to</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(r.id)}
                        onChange={() => toggleSelect(r.id)} className="rounded accent-black" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-700">{r.from_path}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight size={12} className="text-gray-300 shrink-0" />
                        <span className="text-xs font-mono text-gray-600">{r.to_path}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm('Delete this redirect?')) deleteMutation.mutate(r.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2">
              {filtered.map(r => (
                <MobileRowCard
                  key={r.id}
                  selected={selected.includes(r.id)}
                  onSelect={() => toggleSelect(r.id)}
                  header={
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">From</p>
                      <p className="font-mono text-xs text-gray-900 break-all">{r.from_path}</p>
                    </div>
                  }
                  meta={
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">To</p>
                      <p className="inline-flex items-start gap-1 font-mono text-xs text-gray-700 break-all">
                        <ArrowRight size={11} className="text-gray-300 shrink-0 mt-0.5" />
                        {r.to_path}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Created {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  }
                  actions={
                    <button
                      onClick={() => { if (confirm('Delete this redirect?')) deleteMutation.mutate(r.id); }}
                      aria-label="Delete redirect"
                      className="h-7 px-2.5 inline-flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )}

        <div className="px-4 py-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          <span>Learn more about URL redirects</span>
        </div>
      </div>
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Import URL Redirects</h2>
              <button onClick={() => setShowImport(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Upload CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </div>
              <div className="text-xs text-gray-400 text-center">— OR —</div>
              <p className="text-xs text-gray-500">Paste your redirects below, one per line. Format: <code className="bg-gray-100 px-1 rounded">from,to</code></p>
              <textarea
                rows={8}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"/old-page,/new-page\n/summer-sale,/collections/summer\n/about-us,/pages/about"}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:border-gray-400 outline-none resize-none"
              />
              <p className="text-[11px] text-gray-400">{importText.trim().split('\n').filter(l => l.includes(',')).length} redirects detected</p>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button size="sm" className="flex-1"
                disabled={(!importFile && !importText.trim().includes(',')) || importMutation.isPending}
                onClick={handleImport}>
                <Check size={14} /> {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
