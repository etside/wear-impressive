'use client';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronRight, GripVertical, Check, Trash2, Plus } from "lucide-react";
import { navigationMenusApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";
import { MenuLinkPicker } from "@/components/dashboard/menu-link-picker";

interface MenuItem {
  id: number;
  label_en: string;
  label_bn: string;
  link: string;
}
type MenuItemField = 'label_en' | 'label_bn' | 'link';

/* ── Menu Item Row ── */
function MenuItemRow({ item, onUpdate, onDelete }: {
  item: MenuItem;
  onUpdate: (id: number, field: MenuItemField, val: string) => void;
  onDelete: (id: number) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-xl">
      <button className="mt-2.5 text-gray-300 hover:text-gray-500 cursor-grab shrink-0">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Label (English)</label>
          <input
            type="text"
            value={item.label_en}
            onChange={(e) => onUpdate(item.id, 'label_en', e.target.value)}
            placeholder="About us"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Label (বাংলা)</label>
          <input
            type="text"
            value={item.label_bn}
            onChange={(e) => onUpdate(item.id, 'label_bn', e.target.value)}
            placeholder="আমাদের সম্পর্কে"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
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
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
          {showPicker && (
            <MenuLinkPicker
              onChange={(url, picked) => {
                onUpdate(item.id, 'link', url);
                if (!item.label_en) onUpdate(item.id, 'label_en', picked);
              }}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 shrink-0">
        <button onClick={() => onDelete(item.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function AddMenuPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName]       = useState('');
  const [items, setItems]     = useState<MenuItem[]>([{ id: 1, label_en: '', label_bn: '', link: '' }]);
  const [nextId, setNextId]   = useState(2);
  const [error, setError] = useState('');

  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const canSave = name.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: () => navigationMenusApi.create({
      name: name.trim(),
      handle,
      items: items
        .filter((i) => i.label_en.trim() || i.label_bn.trim())
        .map((i) => ({
          label: i.label_en || i.label_bn,
          label_en: i.label_en,
          label_bn: i.label_bn,
          url: i.link,
        })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'navigation-menus'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
      router.push('/dashboard/content/menus');
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to create menu')),
  });

  const addItem = () => {
    setItems(prev => [...prev, { id: nextId, label_en: '', label_bn: '', link: '' }]);
    setNextId(n => n + 1);
  };

  const updateItem = (id: number, field: MenuItemField, val: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));

  const deleteItem = (id: number) =>
    setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/content/menus" className="hover:text-gray-900 transition-colors">Menus</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Add menu</span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Name card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Sidebar menu"
            className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
          />
        </div>
        {name && (
          <p className="text-sm text-gray-500">
            Handle: <span className="text-gray-700 font-mono">{handle}</span>
          </p>
        )}
        {!name && <p className="text-sm text-gray-400">Handle:</p>}
      </div>

      {/* Menu items card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Menu items</h2>
        <div className="space-y-2 mb-3">
          {items.map(item => (
            <MenuItemRow
              key={item.id}
              item={item}
              onUpdate={updateItem}
              onDelete={deleteItem}
            />
          ))}
        </div>
        <button onClick={addItem}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
          <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <Plus size={11} />
          </div>
          Add menu item
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard/content/menus">
          <Button variant="secondary" size="sm">Cancel</Button>
        </Link>
        <Button size="sm" disabled={!canSave || createMutation.isPending} onClick={() => { setError(''); createMutation.mutate(); }}>
          <Check size={14} /> {createMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
