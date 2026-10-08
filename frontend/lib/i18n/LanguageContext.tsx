'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, type Language, type Translations } from './translations';
import { isSupportedLanguage, normalizeLanguageCode, type SupportedLanguage } from './languages';
import { cleanupUnsupportedCookies, changeGoogleTranslateLanguage } from '@/components/language/GoogleTranslateScript';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'craly_lang';
const LEGACY_STORAGE_KEY = 'language';

function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const clean = candidate.toLowerCase().trim();
    if (clean.startsWith('hi')) return 'hi';
    if (clean.startsWith('mr')) return 'mr';
    if (clean.startsWith('en')) return 'en';
  }
  return 'en';
}

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  // 1. Check URL query parameters (?lang=hi, ?locale=mr, ?hl=en)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang') || params.get('locale') || params.get('hl');
    if (urlLang) {
      if (isSupportedLanguage(urlLang)) {
        localStorage.setItem(STORAGE_KEY, urlLang);
        return urlLang;
      }
      // If user provided an unsupported locale in URL, migrate/fallback to en
      localStorage.setItem(STORAGE_KEY, 'en');
      cleanupUnsupportedCookies();
      return 'en';
    }
  } catch {
    // Ignore URL parsing errors
  }

  // 2. Check localStorage
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    if (isSupportedLanguage(saved)) {
      return saved;
    }
    // Stale/unsupported locale in localStorage (e.g. 'fr', 'de') -> migrate to 'en'
    localStorage.setItem(STORAGE_KEY, 'en');
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore
    }
    cleanupUnsupportedCookies();
    return 'en';
  }

  // 3. Fallback to browser/OS language detection
  const detected = detectBrowserLanguage();
  localStorage.setItem(STORAGE_KEY, detected);
  return detected;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const initialLang = resolveInitialLanguage();
    setLanguageState(initialLang);
  }, []);

  const setLanguage = (lang: Language) => {
    const validLang = isSupportedLanguage(lang) ? lang : 'en';
    setLanguageState(validLang);
    localStorage.setItem(STORAGE_KEY, validLang);
    changeGoogleTranslateLanguage(validLang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language] || translations.en,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
