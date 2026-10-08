export interface LanguageItem {
  code: 'en' | 'hi' | 'mr';
  name: string;
  nativeName: string;
  popular?: boolean;
}

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const ALL_LANGUAGES: LanguageItem[] = [
  { code: 'en', name: 'English', nativeName: 'English', popular: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', popular: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', popular: true },
];

export const POPULAR_LANGUAGES: LanguageItem[] = ALL_LANGUAGES;

export function isSupportedLanguage(code: unknown): code is SupportedLanguage {
  return typeof code === 'string' && (code === 'en' || code === 'hi' || code === 'mr');
}

export function normalizeLanguageCode(input?: string | null): SupportedLanguage {
  if (!input || typeof input !== 'string') return 'en';
  const clean = input.toLowerCase().trim();
  if (clean === 'en' || clean.startsWith('en-') || clean.startsWith('en_')) return 'en';
  if (clean === 'hi' || clean.startsWith('hi-') || clean.startsWith('hi_')) return 'hi';
  if (clean === 'mr' || clean.startsWith('mr-') || clean.startsWith('mr_')) return 'mr';
  return 'en';
}

export function getLanguageByCode(code: string): LanguageItem {
  const norm = normalizeLanguageCode(code);
  return ALL_LANGUAGES.find((l) => l.code === norm) || ALL_LANGUAGES[0];
}
