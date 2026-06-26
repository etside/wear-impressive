'use client';
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/context";
import { settingsApi } from "@/lib/api/services/vendor-settings";
import { getApiErrorMessage } from "@/lib/api/client";

export default function NotificationsSettingsPage() {
  const { t } = useLang();
  const d = t.dashSettings;

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const [notifications, setNotifications] = useState<Record<string, { email: boolean; sms: boolean; whatsapp: boolean }>>({
    newOrder:     { email: true,  sms: true,  whatsapp: true  },
    orderShipped: { email: true,  sms: true,  whatsapp: false },
    lowStock:     { email: true,  sms: false, whatsapp: false },
    newCustomer:  { email: false, sms: false, whatsapp: false },
    abandoned:    { email: true,  sms: false, whatsapp: false },
    review:       { email: false, sms: false, whatsapp: false },
  });

  const toggleNotif = (key: string, channel: 'email' | 'sms' | 'whatsapp') => {
    setNotifications(prev => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }));
  };

  // Save notification toggle state via key-value settings API
  const saveNotificationsMutation = useMutation({
    mutationFn: () => settingsApi.update({
      settings: [{ key: 'notification_preferences', value: notifications, group: 'notifications' }],
    }),
    onSuccess: () => showBanner('success', 'Notification preferences saved'),
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to save')),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Choose how you receive notifications for store events</p>
      </div>

      {banner && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 items-center">
            <span className="text-xs font-medium text-gray-500">Event</span>
            <span className="text-xs font-medium text-gray-500 text-center">{d.notifications.email}</span>
            <span className="text-xs font-medium text-gray-500 text-center">{d.notifications.sms}</span>
            <span className="text-xs font-medium text-gray-500 text-center">{d.notifications.whatsapp}</span>
          </div>
        </div>
        {d.notifications.items.map((item) => (
          <div key={item.key} className="px-5 py-4 border-b border-gray-100 last:border-0">
            <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              {(['email','sms','whatsapp'] as const).map(ch => {
                const on = notifications[item.key]?.[ch];
                return (
                  <div key={ch} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggleNotif(item.key, ch)}
                      aria-pressed={on}
                      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-[#2596be]' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="px-5 py-4 bg-gray-50 flex justify-end">
          <Button onClick={() => saveNotificationsMutation.mutate()} disabled={saveNotificationsMutation.isPending}>
            {saveNotificationsMutation.isPending ? 'Saving...' : d.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
