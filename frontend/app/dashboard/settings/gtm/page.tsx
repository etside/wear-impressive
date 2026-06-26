'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { googleTagManagerApi } from '@/lib/api/services/vendor-settings';
import { getApiErrorMessage } from '@/lib/api/client';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function GoogleTagManagerSettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['vendor', 'settings', 'google-tag-manager'],
    queryFn: () => googleTagManagerApi.get(),
  });

  const [form, setForm] = useState<{
    gtm_id: string;
    is_active: boolean;
  }>({
    gtm_id: '',
    is_active: false,
  });

  // Sync form when data loads
  if (settings && !form.gtm_id && settings.gtm_id) {
    setForm({
      gtm_id: settings.gtm_id ?? '',
      is_active: settings.is_active,
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => googleTagManagerApi.update(data),
    onSuccess: () => {
      setSaved(true);
      setError('');
      qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'google-tag-manager'] });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Failed to save settings')),
  });

  const handleSave = () => {
    updateMutation.mutate({ ...form, gtm_id: form.gtm_id.trim() || null });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Google Tag Manager"
        subtitle="Connect GTM for advanced analytics, conversion tracking, and remarketing tags."
      />

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      {!isLoading && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable Google Tag Manager</p>
                <p className="text-xs text-gray-500 mt-0.5">Inject the GTM script on all storefront pages</p>
              </div>
              <ToggleSwitch checked={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
            </div>

            <Input
              label="GTM Container ID"
              placeholder="GTM-XXXXXXX"
              value={form.gtm_id}
              onChange={e => setForm(f => ({ ...f, gtm_id: e.target.value }))}
              hint="Found in Google Tag Manager → Admin → Container Settings"
            />
          </div>

          {form.is_active && !form.gtm_id.trim() && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">GTM is enabled but Container ID is empty — no tracking will occur until you add an ID.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={14} className="text-green-600 shrink-0" />
              <p className="text-xs text-green-700">Settings saved successfully.</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
            {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </>
      )}
    </div>
  );
}
