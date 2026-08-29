'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const COOKIE_NAME = 'googtrans';

export function getSavedLanguageCode(): string {
  if (typeof window === 'undefined') return 'en';
  
  // 1. Check googtrans cookie: /auto/es or /en/es
  const match = document.cookie.match(new RegExp('(^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (match && match[2]) {
    const parts = decodeURIComponent(match[2]).split('/');
    const code = parts[parts.length - 1];
    if (code && code !== 'auto') return code;
  }

  // 2. Fallback to localStorage
  const saved = localStorage.getItem('craly_lang');
  if (saved) return saved;

  return 'en';
}

export function changeGoogleTranslateLanguage(langCode: string): void {
  if (typeof window === 'undefined') return;

  const targetCode = langCode === 'en' ? 'en' : langCode;

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
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
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
