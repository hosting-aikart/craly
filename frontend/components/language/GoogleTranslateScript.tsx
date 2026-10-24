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

/**
 * Every domain a googtrans cookie may live on for this page: host-only, plus
 * the host and each parent domain with a leading dot. Google's element.js
 * writes its own cookie on the root domain (e.g. `.craly.co`) while the page
 * may be served from `www.craly.co` — if we only touch the exact hostname, that
 * root-domain cookie survives every switch and the page snaps back to it.
 * Browsers silently ignore invalid domains (public suffixes, `.localhost`).
 */
function cookieDomains(): (string | null)[] {
  const labels = window.location.hostname.split('.');
  const domains: (string | null)[] = [null];
  // Stop before the bare TLD ("co", "com", "in").
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.');
    domains.push(domain, `.${domain}`);
  }
  return domains;
}

function writeGoogTransCookie(value: string): void {
  for (const domain of cookieDomains()) {
    const domainAttr = domain ? `; domain=${domain}` : '';
    document.cookie = `${COOKIE_NAME}=${value}${domainAttr}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

/** Removes googtrans everywhere — the only reliable way back to the untranslated page. */
function clearGoogTransCookie(): void {
  for (const domain of cookieDomains()) {
    const domainAttr = domain ? `; domain=${domain}` : '';
    document.cookie = `${COOKIE_NAME}=${domainAttr}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}

export function cleanupUnsupportedCookies(): void {
  if (typeof window === 'undefined') return;

  const match = document.cookie.match(new RegExp('(^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (match && match[2]) {
    const parts = decodeURIComponent(match[2]).split('/');
    const code = parts[parts.length - 1];
    if (code && code !== 'auto' && !isSupportedLanguage(code)) {
      // Unsupported language left over from an older setup — back to the original page.
      clearGoogTransCookie();
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

  // 2. English is the page's own language: drop the cookie on every domain and
  // reload. Selecting "en" in Google's dropdown doesn't reliably undo a
  // translation, and a leftover cookie would re-translate on the next load.
  if (targetCode === 'en') {
    clearGoogTransCookie();
    window.location.reload();
    return;
  }

  // 3. Set the cookie on every domain so no stale copy can override it
  writeGoogTransCookie(`/en/${targetCode}`);

  // 4. Dispatch change event to the hidden Google Translate dropdown if loaded
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
