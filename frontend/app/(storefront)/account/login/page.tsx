'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { getApiErrorMessage } from '@/lib/api/client';

export default function LoginPageWrapper() {

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const __sb = useShopBase();

  const { t } = useLang();
  const a = t.storeAuth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || `${__sb}/account`;

  // Login by mobile or email — segmented toggle lets the customer pick
  // whichever they signed up with. The backend's LoginRequest accepts both
  // (`required_without:phone` / `required_without:email`).
  const [mode, setMode] = useState<'mobile' | 'email'>('mobile');
  const [phone, setPhone] = useState('');
  const phoneDigits = phone.replace(/\D/g, '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => customerAuthApi.login(
      mode === 'mobile'
        ? { phone: phoneDigits, password, remember: rememberMe }
        : { email: email.trim(), password, remember: rememberMe }
    ),
    onSuccess: () => router.push(redirectTo),
    onError: (err) => setError(getApiErrorMessage(err, 'Invalid credentials')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">MY</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">{a.signIn}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mobile / Email toggle — segmented control. Both fields share
              the same backend endpoint; we just send the active one. */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('mobile')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.tabMobile}
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.tabEmail}
            </button>
          </div>

          {mode === 'mobile' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.mobileSignInLabel}</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={14}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.email}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.password}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black/20"
              />
              <span className="text-sm text-gray-600">{a.rememberMe}</span>
            </label>
            <Link href={`${__sb}/account/forgot-password`} className="text-sm font-medium text-gray-900 hover:underline">
              {a.forgotPassword}
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {loginMutation.isPending ? 'Signing in...' : a.signInBtn}
          </button>
        </form>

        {/* Register link */}
        <p className="text-sm text-center text-gray-500 mt-6">
          {a.noAccount}{' '}
          <Link href={`${__sb}/account/register`} className="font-medium text-gray-900 hover:underline">
            {a.createOne}
          </Link>
        </p>
      </div>
    </div>
  );
}
