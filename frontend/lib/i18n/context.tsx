'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import translations, { Lang, Translations } from './translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'bn',
  setLang: () => {},
  t: translations.bn,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn');

  // Persist preference + update <html lang> attribute
  useEffect(() => {
    const saved = localStorage.getItem('et-lang') as Lang | null;
    if (saved === 'bn' || saved === 'en') setLangState(saved);
  }, []);

  function applyLang(l: Lang) {
    document.documentElement.lang = l;
    if (l === 'bn') {
      // Override --font-sans so font-sans utility class uses Bangla font everywhere
      document.documentElement.style.setProperty(
        '--font-sans',
        "'Li Ador Noirrit', 'Hind Siliguri', sans-serif"
      );
    } else {
      document.documentElement.style.removeProperty('--font-sans');
    }
  }

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('et-lang', l);
    applyLang(l);
  }

  // Sync on initial load and whenever lang changes
  useEffect(() => { applyLang(lang); }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
