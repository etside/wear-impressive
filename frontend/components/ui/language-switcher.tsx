'use client';

import { useLang } from '@/lib/i18n/context';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, setLang } = useLang();

  const base = 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors select-none';
  const styles = {
    light: 'text-gray-600 hover:bg-gray-100',
    dark:  'text-gray-300 hover:bg-white/10',
  };

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
      className={`${base} ${styles[variant]}`}
      aria-label="Switch language"
      title={lang === 'en' ? 'বাংলায় দেখুন' : 'View in English'}
    >
      <Languages size={15} />
      <span className="w-6 text-center">{lang === 'en' ? 'বাং' : 'EN'}</span>
    </button>
  );
}
