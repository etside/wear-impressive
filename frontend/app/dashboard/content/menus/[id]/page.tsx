'use client';
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronRight, GripVertical, Trash2, Plus, Check } from "lucide-react";
import { navigationMenusApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";
import { MenuLinkPicker } from "@/components/dashboard/menu-link-picker";

interface MenuItem { id: number; label_en: string; label_bn: string; link: string; }
type MenuItemField = 'label_en' | 'label_bn' | 'link';

function MenuItemRow({ item, onUpdate, onDelete }: {
  item: MenuItem;
  onUpdate: (id: number, f: MenuItemField, v: string) => void;
  onDelete: (id: number) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-xl">
      <button className="mt-2.5 text-gray-300 cursor-grab shrink-0"><GripVertical size={16} /></button>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Label (English)</label>
          <input
            type="text"
            value={item.label_en}
            onChange={(e) => onUpdate(item.id, 'label_en', e.target.value)}
            placeholder="About us"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Label (বাংলা)</label>
          <input
            type="text"
            value={item.label_bn}
            onChange={(e) => onUpdate(item.id, 'label_bn', e.target.value)}
            placeholder="আমাদের সম্পর্কে"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div className="relative">
          <label className="block text-[11px] font-medium text-blue-600 mb-1">Link</label>
          <input
            type="text"
            value={item.link}
            onChange={(e) => onUpdate(item.id, 'link', e.target.value)}
            onFocus={() => setShowPicker(true)}
            placeholder="Search or paste link"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          />
          {showPicker && (
            <MenuLinkPicker
              onChange={(v, picked) => {
                onUpdate(item.id, 'link', v);
                // Picker auto-fills the English label only when nothing is set yet,
                // so we never clobber what the vendor already typed.
                if (!item.label_en) onUpdate(item.id, 'label_en', picked);
              }}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="mt-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const menuId = Number(id);

  const [name, setName] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [nextId, setNextId] = useState(100);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data: menu, isLoading } = useQuery({
    queryKey: ['vendor', 'navigation-menus', menuId],
    queryFn: () => navigationMenusApi.get(menuId),
    enabled: !!menuId && !Number.isNaN(menuId),
  });

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setItems((menu.items ?? []).map((it, idx) => {
        const raw = it as unknown as { label?: string; label_en?: string; label_bn?: string };
        return {
          id: idx + 1,
          // Hydrate from new bilingual keys; fall back to the legacy `label`
          // so old menus open with their text already in the English column.
          label_en: raw.label_en ?? raw.label ?? '',
          label_bn: raw.label_bn ?? '',
          link: it.url,
        };
      }));
      setNextId((menu.items?.length ?? 0) + 100);
    }
  }, [menu]);

  const updateMutation = useMutation({
    mutationFn: () => navigationMenusApi.update(menuId, {
      name,
      handle: handle || menu?.handle || '',
      items: items.map((i) => ({
        // Persist all three keys so the storefront resolver and any legacy
        // reader stay happy. `label` mirrors EN (or BN if EN is empty) so
        // older code paths still get text.
        label: i.label_en || i.label_bn,
        label_en: i.label_en,
        label_bn: i.label_bn,
        url: i.link,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'navigation-menus'] });
      // Storefront caches the menu inside store-info-full — bust that too.
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
      showBanner('success', 'Menu saved');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save menu')),
  });

  const addItem = () => { setItems(p => [...p, { id: nextId, label_en: '', label_bn: '', link: '' }]); setNextId(n => n + 1); };
  const updateItem = (id: number, f: MenuItemField, v: string) => setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));
  const deleteItem = (id: number) => setItems(p => p.filter(i => i.id !== id));

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/content/menus" className="hover:text-gray-900 transition-colors">Menus</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{name || 'Edit menu'}</span>
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

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 text-sm text-gray-400 text-center">Loading menu...</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
        </div>
        <p className="text-sm text-gray-500">Handle: <span className="font-mono text-gray-700">{handle}</span></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Menu items</h2>
        <div className="space-y-2 mb-3">
          {items.map(item => (
            <MenuItemRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
          ))}
        </div>
        <button onClick={addItem}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center"><Plus size={11} /></div>
          Add menu item
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/dashboard/content/menus"><Button variant="secondary" size="sm">Discard</Button></Link>
        <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()}>
          <Check size={14} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
