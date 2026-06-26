'use client';

import { useShopBase } from '@/lib/use-shop-base';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Mail, ArrowLeft } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { getApiErrorMessage } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const __sb = useShopBase();


  const { t } = useLang();
  const a = t.storeAuth;

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const forgotMutation = useMutation({
    mutationFn: () => customerAuthApi.forgotPassword({ email }),
    onSuccess: () => setSent(true),
    onError: (err) => setError(getApiErrorMessage(err, 'Could not send reset link')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setError('');
    forgotMutation.mutate();
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

        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{a.checkEmail}</h1>
            <p className="text-sm text-gray-500 mb-6">
              {a.resetSent}{' '}
              <span className="font-medium text-gray-900">{email}</span>
            </p>
            <Link
              href={`${__sb}/account/login`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
            >
              <ArrowLeft size={16} />
              {a.backToSignIn}
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">{a.resetPassword}</h1>
            <p className="text-sm text-gray-500 text-center mb-6">{a.resetSubtitle}</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.email}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                {forgotMutation.isPending ? 'Sending...' : a.sendResetLink}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href={`${__sb}/account/login`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={16} />
                {a.backToSignIn}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
