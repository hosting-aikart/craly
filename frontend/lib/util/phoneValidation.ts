/**
 * Utility for phone number formatting, sanitization, and validation across Craly.
 * Supports E.164 international numbers and India (+91) standard 10-digit mobiles.
 */

export function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export interface PhoneValidationResult {
  isValid: boolean;
  error: string | null;
  digits: string;
  cleaned: string;
}

export function validatePhoneNumber(
  raw: string | null | undefined,
  options?: {
    required?: boolean;
    dialCode?: string;
  }
): PhoneValidationResult {
  const isRequired = options?.required ?? false;
  const dialCode = options?.dialCode ?? '+91';

  if (!raw || !raw.trim()) {
    if (isRequired) {
      return {
        isValid: false,
        error: 'Phone number is required.',
        digits: '',
        cleaned: '',
      };
    }
    return {
      isValid: true,
      error: null,
      digits: '',
      cleaned: '',
    };
  }

  const trimmed = raw.trim();
  const cleaned = cleanPhone(trimmed);

  // Must only contain digits and optional leading +
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number can only contain digits, spaces, and hyphens.',
      digits: cleaned.replace(/\D/g, ''),
      cleaned,
    };
  }

  const digits = cleaned.replace(/\D/g, '');

  // Reject repeating dummy digits (e.g. 0000000000, 1111111111)
  if (digits.length >= 7 && /^(\d)\1+$/.test(digits)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number, not repeated digits.',
      digits,
      cleaned,
    };
  }

  // Country-specific rules:
  // If India (+91), or if the cleaned string starts with +91, or has 10 digits
  const isIndia = dialCode === '+91' || cleaned.startsWith('+91') || (cleaned.startsWith('91') && digits.length === 12);

  if (isIndia) {
    const subscriberDigits = cleaned.startsWith('+91')
      ? digits.slice(2)
      : (cleaned.startsWith('91') && digits.length === 12)
      ? digits.slice(2)
      : digits;

    if (subscriberDigits.length < 10) {
      return {
        isValid: false,
        error: `Please enter a valid 10-digit mobile number (${subscriberDigits.length}/10 digits entered).`,
        digits,
        cleaned,
      };
    }

    if (subscriberDigits.length > 10) {
      return {
        isValid: false,
        error: 'Indian mobile number cannot exceed 10 digits.',
        digits,
        cleaned,
      };
    }

    if (!/^[5-9]\d{9}$/.test(subscriberDigits)) {
      return {
        isValid: false,
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
        digits,
        cleaned,
      };
    }
  } else {
    // International standard ITU E.164: 7 to 15 digits total
    if (digits.length < 7) {
      return {
        isValid: false,
        error: 'Phone number is too short (minimum 7 digits).',
        digits,
        cleaned,
      };
    }

    if (digits.length > 15) {
      return {
        isValid: false,
        error: 'Phone number is too long (maximum 15 digits).',
        digits,
        cleaned,
      };
    }
  }

  return {
    isValid: true,
    error: null,
    digits,
    cleaned,
  };
}

export function isValidPhoneNumber(raw: string | null | undefined, dialCode?: string): boolean {
  return validatePhoneNumber(raw, { required: true, dialCode }).isValid;
}
