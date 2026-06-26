'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Save, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi, type CustomerProfileUpdatePayload } from '@/lib/api/services/customer-auth';
import { getApiErrorMessage } from '@/lib/api/client';

export default function AccountProfilePage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const p = t.accountProfile;

  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
  });

  const customer = meQuery.data?.customer;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Hydrate form from server data once loaded.
  useEffect(() => {
    if (!customer) return;
    setName(customer.name ?? '');
    setEmail(customer.email ?? '');
    setPhone(customer.phone ?? '');
    setDob(customer.date_of_birth ?? '');
    setGender((customer.gender as '' | 'male' | 'female' | 'other') ?? '');
  }, [customer]);

  const profileMutation = useMutation({
    mutationFn: (data: CustomerProfileUpdatePayload) => customerAuthApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', 'me'] });
      setProfileMsg({ kind: 'ok', text: p.profileSaved });
    },
    onError: (err) => setProfileMsg({ kind: 'err', text: getApiErrorMessage(err, p.profileSaveFailed) }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: CustomerProfileUpdatePayload) => customerAuthApi.updateProfile(data),
    onSuccess: () => {
      setPwdMsg({ kind: 'ok', text: p.passwordChanged });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    },
    onError: (err) => setPwdMsg({ kind: 'err', text: getApiErrorMessage(err, p.passwordChangeFailed) }),
  });

  function saveProfile() {
    setProfileMsg(null);
    profileMutation.mutate({
      name,
      email: email || null,
      phone: phone || null,
      date_of_birth: dob || null,
      gender: gender || null,
    });
  }

  function changePassword() {
    setPwdMsg(null);
    if (newPwd.length < 8) {
      setPwdMsg({ kind: 'err', text: p.passwordTooShort });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ kind: 'err', text: p.passwordMismatch });
      return;
    }
    passwordMutation.mutate({
      current_password: currentPwd,
      password: newPwd,
      password_confirmation: confirmPwd,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">{p.heading}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{p.subheading}</p>
      </div>

      {/* Profile fields */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{p.personalInfo}</h3>
        </div>

        {profileMsg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              profileMsg.kind === 'ok'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {profileMsg.text}
          </div>
        )}

        {meQuery.isLoading ? (
          <div className="text-center py-8 text-sm text-gray-400">{p.loading}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input label={p.name} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Input label={p.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label={p.phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input
                label={p.dob}
                type="date"
                value={dob ? dob.slice(0, 10) : ''}
                onChange={(e) => setDob(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-800">{p.gender}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as '' | 'male' | 'female' | 'other')}
                  className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="">{p.genderHide}</option>
                  <option value="male">{p.genderMale}</option>
                  <option value="female">{p.genderFemale}</option>
                  <option value="other">{p.genderOther}</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <Button onClick={saveProfile} loading={profileMutation.isPending} disabled={profileMutation.isPending}>
                <Save size={14} /> {p.saveChanges}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Password */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{p.changePassword}</h3>
        </div>

        {pwdMsg && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              pwdMsg.kind === 'ok'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {pwdMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input
              label={p.currentPassword} type="password" autoComplete="current-password"
              value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </div>
          <Input
            label={p.newPassword} type="password" autoComplete="new-password"
            value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
          />
          <Input
            label={p.confirmNewPassword} type="password" autoComplete="new-password"
            value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
          />
        </div>

        <div className="mt-5">
          <Button
            onClick={changePassword}
            loading={passwordMutation.isPending}
            disabled={passwordMutation.isPending || !currentPwd || !newPwd}
          >
            <Lock size={14} /> {p.changePassword}
          </Button>
        </div>
      </section>
    </div>
  );
}
