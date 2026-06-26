'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/context";
import { getApiErrorMessage } from "@/lib/api/client";
import { securityApi, type ChangePasswordPayload } from "@/lib/api/services/vendor-account-settings";

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function SecuritySettingsPage() {
  const { t } = useLang();
  const d = t.dashSettings;
  const queryClient = useQueryClient();

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordStatusQuery = useQuery({
    queryKey: ['vendor', 'settings', 'security', 'password'],
    queryFn: async () => {
      try {
        return await securityApi.getPassword();
      } catch {
        return null;
      }
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => securityApi.changePassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'settings', 'security', 'password'] });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showBanner('success', 'Password changed successfully');
    },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to change password')),
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showBanner('error', 'Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showBanner('error', 'New passwords do not match');
      return;
    }
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    });
  };

  const passwordStatus = passwordStatusQuery.data;
  const passwordFeatureMissing = !passwordStatusQuery.isLoading && passwordStatus === null;

  const strengthLabel = passwordStatus?.password_strength
    ? passwordStatus.password_strength.charAt(0).toUpperCase() + passwordStatus.password_strength.slice(1)
    : null;
  const strengthVariant: 'success' | 'warning' | 'error' | 'default' =
    passwordStatus?.password_strength === 'strong' ? 'success'
    : passwordStatus?.password_strength === 'ok' ? 'warning'
    : passwordStatus?.password_strength === 'weak' ? 'error'
    : 'default';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{d.security.changePassword}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your password</p>
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

      {/* Change Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{d.security.changePassword}</h3>
          {passwordStatus && (
            <div className="flex items-center gap-2">
              {strengthLabel && (
                <Badge variant={strengthVariant}>Strength: {strengthLabel}</Badge>
              )}
              {passwordStatus.last_changed_at && (
                <span className="text-xs text-gray-500">
                  Last changed {formatRelative(passwordStatus.last_changed_at)}
                </span>
              )}
            </div>
          )}
        </div>

        {passwordFeatureMissing && (
          <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border bg-yellow-50 border-yellow-200 text-yellow-800">
            Feature not ready — password status unavailable. You may still attempt to change your password.
          </div>
        )}

        <div className="flex flex-col gap-4 max-w-sm">
          <Input
            label={d.security.currentPassword}
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label={d.security.newPassword}
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label={d.security.confirmPassword}
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button
            className="w-fit"
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? 'Saving...' : d.save}
          </Button>
        </div>
      </div>

    </div>
  );
}
