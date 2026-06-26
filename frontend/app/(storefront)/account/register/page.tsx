'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { getApiErrorMessage } from '@/lib/api/client';

function getPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
  if (pw.length < 6) return 'weak';
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  if (pw.length >= 10 && score >= 3) return 'strong';
  if (pw.length >= 8 && score >= 2) return 'medium';
  return 'weak';
}

const strengthColors = { weak: 'bg-red-400', medium: 'bg-yellow-400', strong: 'bg-green-500' };
const strengthWidths = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' };

export default function RegisterPage() {
  const __sb = useShopBase();


  const { t } = useLang();
  const a = t.storeAuth;
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // Bangladeshi mobile: 11 digits, starts with 01 followed by carrier prefix
  // (3-9). Strip non-digits before validating so paste-with-dashes still works.
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneFormatValid = /^01[3-9]\d{8}$/.test(phoneDigits);

  const registerMutation = useMutation({
    mutationFn: () => customerAuthApi.register({
      name,
      // Email is optional now; only send it when the customer typed one.
      email: email.trim() ? email.trim() : undefined,
      // Send the canonical 11-digit form (e.g. 01712345678). Any dashes/spaces
      // the user typed are already stripped above.
      phone: phoneDigits,
      password,
      password_confirmation: confirmPassword,
    }),
    onSuccess: () => router.push(`${__sb}/account`),
    onError: (err) => setError(getApiErrorMessage(err, 'Registration failed')),
  });

  const isValid =
    name.trim().length > 0 &&
    phoneFormatValid &&
    // Email is optional — but if the customer typed something, it must be a
    // valid email.
    (email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreed;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    registerMutation.mutate();
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

        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">{a.createAccount}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.fullName}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sanjida Priya"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                required
              />
            </div>
          </div>

          {/* Mobile Number — required, comes before email so customers can
              register without an email address. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.mobileNumber}</label>
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
            {phone.trim() !== '' && !phoneFormatValid && (
              <p className="text-xs text-red-500 mt-1">{a.mobileInvalid}</p>
            )}
          </div>

          {/* Email — optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.emailOptional}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
              />
            </div>
          </div>

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
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthColors[strength]} ${strengthWidths[strength]}`} />
                </div>
                <p className={`text-xs mt-1 ${strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {strength === 'weak' ? a.passwordWeak : strength === 'medium' ? a.passwordMedium : a.passwordStrong}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.confirmPassword}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-900 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-black focus:ring-black/20"
            />
            <span className="text-sm text-gray-600">
              {a.agreeToTerms}{' '}
              <Link href={`${__sb}/terms`} className="font-medium text-gray-900 hover:underline">{a.termsOfService}</Link>
              {' '}{a.and}{' '}
              <Link href={`${__sb}/privacy`} className="font-medium text-gray-900 hover:underline">{a.privacyPolicy}</Link>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || registerMutation.isPending}
            className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? 'Creating account...' : a.createAccountBtn}
          </button>
        </form>

        {/* Login link */}
        <p className="text-sm text-center text-gray-500 mt-6">
          {a.haveAccount}{' '}
          <Link href={`${__sb}/account/login`} className="font-medium text-gray-900 hover:underline">
            {a.signInLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
