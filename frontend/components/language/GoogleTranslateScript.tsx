'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { isSupportedLanguage, normalizeLanguageCode, type SupportedLanguage } from '@/lib/i18n/languages';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const COOKIE_NAME = 'googtrans';

export function cleanupUnsupportedCookies(): void {
  if (typeof window === 'undefined') return;

  const domain = window.location.hostname;
  const match = document.cookie.match(new RegExp('(^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (match && match[2]) {
    const parts = decodeURIComponent(match[2]).split('/');
    const code = parts[parts.length - 1];
    if (code && code !== 'auto' && !isSupportedLanguage(code)) {
      // Clear unsupported cookie or reset to /auto/en
      const fallbackCookie = '/auto/en';
      document.cookie = `${COOKIE_NAME}=${fallbackCookie}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `${COOKIE_NAME}=${fallbackCookie}; domain=.${domain}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `${COOKIE_NAME}=${fallbackCookie}; domain=${domain}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }
}

export function getSavedLanguageCode(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  // 1. Check googtrans cookie: /auto/es or /en/es
  const match = document.cookie.match(new RegExp('(^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (match && match[2]) {
    const parts = decodeURIComponent(match[2]).split('/');
    const code = parts[parts.length - 1];
    if (code && code !== 'auto') {
      if (isSupportedLanguage(code)) {
        return code;
      }
      // Stale / unsupported cookie detected — clean up
      cleanupUnsupportedCookies();
    }
  }

  // 2. Check localStorage
  const saved = localStorage.getItem('craly_lang') || localStorage.getItem('language');
  if (saved) {
    const normalized = normalizeLanguageCode(saved);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
    // Stale / unsupported localStorage detected — migrate to 'en'
    localStorage.setItem('craly_lang', 'en');
    return normalized;
  }

  return 'en';
}

export function changeGoogleTranslateLanguage(langCode: string): void {
  if (typeof window === 'undefined') return;

  const targetCode = normalizeLanguageCode(langCode);

  // 1. Store in localStorage
  localStorage.setItem('craly_lang', targetCode);

  // 2. Set cookies across all domains/paths
  const domain = window.location.hostname;
  const cookieValue = `/auto/${targetCode}`;

  document.cookie = `${COOKIE_NAME}=${cookieValue}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `${COOKIE_NAME}=${cookieValue}; domain=.${domain}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `${COOKIE_NAME}=${cookieValue}; domain=${domain}; path=/; max-age=31536000; SameSite=Lax`;

  // 3. Dispatch change event to the hidden Google Translate dropdown if loaded
  const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (selectElem) {
    selectElem.value = targetCode;
    selectElem.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Reload page to re-hydrate translation with new cookie
    window.location.reload();
  }
}

export default function GoogleTranslateScript() {
  useEffect(() => {
    // Clean up any stale cookies from previously supported 150+ languages
    cleanupUnsupportedCookies();

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,mr',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE,
          },
          'google_translate_element',
        );
      }
    };
  }, []);

  return (
    <>
      <div
        id="google_translate_element"
        style={{ display: 'none', position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
}
