'use client';

import React from 'react';
import { COUNTRIES } from '@/lib/util/countries';
import './PhoneInput.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

const INDIA = COUNTRIES.find((c) => c.code === 'IN') ?? COUNTRIES[0];
const SORTED_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

/**
 * Splits a stored phone string into {dialCode, number}. Handles both the
 * "+91 9876543210" format this component writes and legacy plain-digit
 * values ("9876543210") saved before it existed — those default to India,
 * since that's this platform's primary market.
 */
function parsePhoneValue(value: string | null | undefined): { dialCode: string; number: string } {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return { dialCode: INDIA.dialCode, number: '' };

  if (trimmed.startsWith('+')) {
    const match = SORTED_BY_DIAL_LENGTH.find((c) => trimmed.startsWith(c.dialCode));
    if (match) {
      return { dialCode: match.dialCode, number: trimmed.slice(match.dialCode.length).trim() };
    }
  }

  return { dialCode: INDIA.dialCode, number: trimmed };
}

function formatPhoneValue(dialCode: string, number: string): string {
  const digits = number.trim();
  return digits ? `${dialCode} ${digits}` : '';
}

/**
 * Single reusable phone field with a country-code selector, used everywhere
 * a phone number is collected outside of /signup (which already has its
 * own richer country picker built on the same lib/util/countries.ts data —
 * this reuses that file rather than a second country list). Emits one
 * combined string ("+91 9876543210") so every existing `phone`
 * column/field stays a plain text value — no API or schema change needed
 * to adopt this.
 */
export default function PhoneInput({ value, onChange, placeholder, required, id }: PhoneInputProps) {
  const { dialCode, number } = parsePhoneValue(value);

  const handleDialCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(formatPhoneValue(e.target.value, number));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneValue(dialCode, e.target.value));
  };

  return (
    <div className="phone-input">
      <select
        className="phone-input__country"
        value={dialCode}
        onChange={handleDialCodeChange}
        aria-label="Country code"
      >
        {COUNTRIES.map((c) => (
          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
            {c.flag} {c.name} ({c.dialCode})
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        className="phone-input__number"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder || '98765 43210'}
        required={required}
      />
    </div>
  );
}
