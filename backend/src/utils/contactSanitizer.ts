/**
 * Utility to detect and sanitize/redact off-platform contact details
 * (phone numbers, mobile numbers, email addresses, WhatsApp links, and website URLs).
 */

const REDACTED_PLACEHOLDER = '[Contact Info Hidden by Craly - Use Craly Platform Messaging]';

// Email addresses (standard and obfuscated like user[at]gmail)
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+(?:\s*\[at\]\s*|\s*@\s*)[A-Za-z0-9.-]+(?:\s*\[dot\]\s*|\s*\.\s*)[A-Za-z]{2,}\b/gi;

// Phone numbers (International and standard formats)
const PHONE_INTL_REGEX = /\b(?:\+\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;
const PHONE_10_REGEX = /\b(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b/g;
const PHONE_GENERIC_REGEX = /\b(?:\+?91[\s.-]?)?[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// Spaced out numbers intended to bypass filters (e.g. 9 8 7 6 5 4 3 2 1 0)
const SPACED_DIGITS_REGEX = /(?:[6-9]\s*){1}(?:\d\s*){9}/g;

// Phone keywords followed by numbers (e.g. "call me 98765...", "ph: 9876...", "whatsapp 9876...")
const PHONE_KEYWORD_REGEX = /\b(?:call|ph|phone|mob|mobile|whatsapp|wa|contact)\s*[:=.-]?\s*[\d\s+.-]{7,15}\b/gi;

// URLs, domains, and social links
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s<>]+\b/gi;
const DOMAIN_REGEX = /\b[a-zA-Z0-9-]+\.(?:com|in|co\.in|org|net|io|me|dev|app)\b/gi;
const SOCIAL_LINK_REGEX = /\b(?:wa\.me|t\.me|instagram\.com|facebook\.com)\/[^\s<>]+\b/gi;

export interface SanitizeResult {
  sanitizedText: string;
  hasContactInfo: boolean;
}

export function sanitizeContactInfo(input: string | null | undefined): string {
  if (!input) return '';
  let result = input;

  // Redact emails
  result = result.replace(EMAIL_REGEX, REDACTED_PLACEHOLDER);

  // Redact URLs and domain links
  result = result.replace(URL_REGEX, REDACTED_PLACEHOLDER);
  result = result.replace(SOCIAL_LINK_REGEX, REDACTED_PLACEHOLDER);
  result = result.replace(DOMAIN_REGEX, REDACTED_PLACEHOLDER);

  // Redact phone keyword patterns
  result = result.replace(PHONE_KEYWORD_REGEX, REDACTED_PLACEHOLDER);

  // Redact phone numbers (international and domestic formats)
  result = result.replace(PHONE_INTL_REGEX, REDACTED_PLACEHOLDER);
  result = result.replace(PHONE_10_REGEX, REDACTED_PLACEHOLDER);
  result = result.replace(PHONE_GENERIC_REGEX, REDACTED_PLACEHOLDER);

  // Redact spaced-out digits (e.g. 9 8 7 6 5 4 3 2 1 0)
  result = result.replace(SPACED_DIGITS_REGEX, REDACTED_PLACEHOLDER);

  return result;
}
