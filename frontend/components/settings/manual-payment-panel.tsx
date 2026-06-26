'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { paymentMethodsApi } from '@/lib/api/services/vendor-settings';
import { filesApi } from '@/lib/api/services/vendor-content';
import { getApiErrorMessage } from '@/lib/api/client';

type ChannelType = 'mfs' | 'bank' | 'qr';

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  account_number?: string;
  // Bank-only
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  account_type?: 'current' | 'savings' | '';
  // QR-only
  qr_image_url?: string;
}

function newId(): string {
  return 'ch_' + Math.random().toString(36).slice(2, 10);
}

function emptyChannel(type: ChannelType = 'mfs'): Channel {
  return { id: newId(), type, name: '' };
}

/**
 * Manual mobile-banking gateway editor.
 *
 * Shape stored in `payment_methods.metadata`:
 *   {
 *     channels: [{ id, type, name, ... }, ...],
 *     action_label, instructions
 *   }
 *
 * Backward compat: if the stored metadata uses the old flat keys
 * (bkash_number / nagad_number / rocket_number) the editor hydrates them as
 * three pre-filled MFS channels. On save we always write the new `channels`
 * array; the legacy keys are also written so older clients can still read.
 */
export function ManualPaymentPanel() {
  const qc = useQueryClient();
  const [banner, setBanner] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [actionLabel, setActionLabel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const methodsQuery = useQuery({
    queryKey: ['vendor', 'payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const manual = methodsQuery.data?.find((m) => m.provider === 'manual') ?? null;

  useEffect(() => {
    if (!manual || hydrated) return;
    const meta = (manual.metadata ?? {}) as Record<string, unknown>;

    // Prefer the new `channels` array; fall back to the legacy flat keys.
    let next: Channel[] = [];
    if (Array.isArray(meta.channels)) {
      next = (meta.channels as Array<Record<string, unknown>>).map((row) => ({
        id: typeof row.id === 'string' && row.id ? row.id : newId(),
        type: (['mfs', 'bank', 'qr'].includes(String(row.type)) ? row.type : 'mfs') as ChannelType,
        name: String(row.name ?? ''),
        account_number: row.account_number ? String(row.account_number) : '',
        account_name: row.account_name ? String(row.account_name) : '',
        bank_name: row.bank_name ? String(row.bank_name) : '',
        branch_name: row.branch_name ? String(row.branch_name) : '',
        account_type: (['current', 'savings'].includes(String(row.account_type)) ? row.account_type : '') as Channel['account_type'],
        qr_image_url: row.qr_image_url ? String(row.qr_image_url) : '',
      }));
    } else {
      // Legacy hydration — promote the three flat keys to MFS channels.
      const legacy = [
        { id: 'bkash',  name: 'bKash',  number: meta.bkash_number  as string | undefined },
        { id: 'nagad',  name: 'Nagad',  number: meta.nagad_number  as string | undefined },
        { id: 'rocket', name: 'Rocket', number: meta.rocket_number as string | undefined },
      ];
      next = legacy
        .filter((r) => r.number && String(r.number).trim())
        .map((r) => ({
          id: r.id,
          type: 'mfs' as ChannelType,
          name: r.name,
          account_number: String(r.number),
        }));
    }

    setChannels(next);
    setActionLabel(typeof meta.action_label === 'string' ? meta.action_label : '');
    setInstructions(typeof meta.instructions === 'string' ? meta.instructions : '');
    setEnabled(!!manual.is_active);
    setHydrated(true);
  }, [manual, hydrated]);

  const saveMut = useMutation({
    mutationFn: () => {
      if (!manual) throw new Error('Manual payment method is not provisioned for this store.');

      // Build the canonical channels array. Empty/invalid rows are silently
      // dropped so the storefront doesn't render half-configured options.
      const cleaned = channels
        .map((c) => ({ ...c, name: c.name.trim() }))
        .filter((c) => c.name)
        .map((c) => {
          if (c.type === 'mfs') {
            const num = (c.account_number ?? '').trim();
            return num ? { id: c.id, type: c.type, name: c.name, account_number: num } : null;
          }
          if (c.type === 'bank') {
            const num = (c.account_number ?? '').trim();
            if (!num) return null;
            return {
              id: c.id, type: c.type, name: c.name,
              account_number: num,
              account_name: (c.account_name ?? '').trim() || null,
              bank_name:    (c.bank_name ?? '').trim()    || null,
              branch_name:  (c.branch_name ?? '').trim()  || null,
              account_type: c.account_type || null,
            };
          }
          // qr
          const url = (c.qr_image_url ?? '').trim();
          return url ? { id: c.id, type: c.type, name: c.name, qr_image_url: url } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      // Mirror the first MFS hits onto the legacy flat keys so older
      // storefront builds keep working until they redeploy. Harmless for
      // current builds — they read `channels` first.
      const legacyMirror: Record<string, string | null> = {
        bkash_number: null, nagad_number: null, rocket_number: null,
      };
      cleaned.forEach((c) => {
        if (c.type !== 'mfs') return;
        const lc = c.name.toLowerCase();
        for (const key of ['bkash', 'nagad', 'rocket'] as const) {
          if (lc.includes(key) && !legacyMirror[`${key}_number`]) {
            legacyMirror[`${key}_number`] = c.account_number ?? null;
            break;
          }
        }
      });

      return paymentMethodsApi.update(manual.id, {
        is_active: enabled,
        metadata: {
          channels: cleaned,
          action_label: actionLabel.trim(),
          instructions: instructions.trim(),
          ...legacyMirror,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'payment-methods'] });
      qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'payment-methods'] });
      qc.invalidateQueries({ queryKey: ['storefront', 'checkout', 'calc'] });
      setBanner('Saved.');
      setTimeout(() => setBanner(null), 2500);
    },
    onError: (err) => setBanner(getApiErrorMessage(err, 'Failed to save.')),
  });

  function patchChannel(id: string, patch: Partial<Channel>) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addChannel() {
    setChannels((prev) => [...prev, emptyChannel()]);
  }
  function removeChannel(id: string) {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }
  function moveChannel(id: string, direction: -1 | 1) {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  async function uploadQr(channelId: string, file: File) {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('QR must be an image (PNG/JPG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('QR image must be 5 MB or less.');
      return;
    }
    setUploadingId(channelId);
    try {
      const asset = await filesApi.upload(file, { folder: 'payment-channels' });
      patchChannel(channelId, { qr_image_url: asset.url });
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Could not upload QR image.'));
    } finally {
      setUploadingId(null);
    }
  }

  const channelCount = useMemo(() => channels.length, [channels]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Manual Payment Methods</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Customers see the channels you add below and submit a transaction ID + screenshot after sending money.
          </p>
        </div>
        {banner && <span className="text-xs text-green-600">{banner}</span>}
      </div>

      <label className="flex items-center gap-3 mb-5 cursor-pointer">
        <ToggleSwitch checked={enabled} onChange={setEnabled} />
        <span className="text-sm text-gray-800">Accept manual payments</span>
      </label>

      <div className="flex flex-col gap-3">
        {channels.map((c, i) => (
          <ChannelCard
            key={c.id}
            channel={c}
            index={i}
            total={channelCount}
            uploading={uploadingId === c.id}
            onPatch={(patch) => patchChannel(c.id, patch)}
            onRemove={() => removeChannel(c.id)}
            onMove={(d) => moveChannel(c.id, d)}
            onUploadQr={(file) => uploadQr(c.id, file)}
          />
        ))}
      </div>

      {uploadError && (
        <p className="text-xs text-red-600 mt-3">{uploadError}</p>
      )}

      <button
        type="button"
        onClick={addChannel}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2 transition-colors"
      >
        <Plus size={14} /> Add payment method
      </button>

      <div className="mt-5">
        <Input
          label="Call-to-action heading"
          placeholder='e.g. "Send Money to", "Make Payment to", "Cash Out to"'
          value={actionLabel}
          onChange={(e) => setActionLabel(e.target.value)}
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          Shown above the channels at checkout. Defaults to &quot;Send money to&quot; if left blank.
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Instructions to the customer (optional)</label>
        <textarea
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder='e.g. Use "Send Money" (not Payment). Include your phone number in the reference.'
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none resize-none focus:border-gray-400"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !manual}>
          {saveMut.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

/* ── Per-channel sub-card ────────────────────────────────────────────── */
function ChannelCard({
  channel: c, index, total, uploading,
  onPatch, onRemove, onMove, onUploadQr,
}: {
  channel: Channel;
  index: number;
  total: number;
  uploading: boolean;
  onPatch: (patch: Partial<Channel>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onUploadQr: (file: File) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">Method {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600">Account type</label>
          <select
            value={c.type}
            onChange={(e) => onPatch({ type: e.target.value as ChannelType })}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
          >
            <option value="mfs">MFS (bKash / Nagad / Rocket / Upay)</option>
            <option value="bank">Bank account</option>
            <option value="qr">QR code</option>
          </select>
        </div>
        <Input
          label="Display name"
          placeholder={
            c.type === 'mfs' ? 'bKash (Personal)'
              : c.type === 'bank' ? 'Dutch-Bangla Bank'
                : 'Scan to Pay'
          }
          value={c.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
      </div>

      {/* MFS — single account number */}
      {c.type === 'mfs' && (
        <div className="mt-3">
          <Input
            label="Account number"
            placeholder="017XXXXXXXX"
            value={c.account_number ?? ''}
            onChange={(e) => onPatch({ account_number: e.target.value })}
          />
        </div>
      )}

      {/* Bank — full details */}
      {c.type === 'bank' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Account name"
            placeholder="Wear Impressive Ltd"
            value={c.account_name ?? ''}
            onChange={(e) => onPatch({ account_name: e.target.value })}
          />
          <Input
            label="Account number"
            placeholder="1234567890123"
            value={c.account_number ?? ''}
            onChange={(e) => onPatch({ account_number: e.target.value })}
          />
          <Input
            label="Bank name"
            placeholder="Dutch-Bangla Bank Ltd"
            value={c.bank_name ?? ''}
            onChange={(e) => onPatch({ bank_name: e.target.value })}
          />
          <Input
            label="Branch"
            placeholder="Gulshan-2 Branch"
            value={c.branch_name ?? ''}
            onChange={(e) => onPatch({ branch_name: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">Account type</label>
            <select
              value={c.account_type ?? ''}
              onChange={(e) => onPatch({ account_type: e.target.value as Channel['account_type'] })}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
            >
              <option value="">Select...</option>
              <option value="current">Current</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </div>
      )}

      {/* QR — image upload */}
      {c.type === 'qr' && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">QR image</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-white text-sm text-gray-700">
              <Upload size={14} />
              {uploading ? 'Uploading...' : c.qr_image_url ? 'Replace QR' : 'Upload QR'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadQr(file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {c.qr_image_url ? (
              <Image
                src={c.qr_image_url}
                alt="QR preview"
                width={56}
                height={56}
                unoptimized
                className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-white"
              />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-300">
                <ImageIcon size={20} />
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">PNG or JPG, up to 5 MB.</p>
        </div>
      )}
    </div>
  );
}
