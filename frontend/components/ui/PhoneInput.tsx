'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, type CountryOption } from '@/lib/util/countries';
import { IconChevronDown, IconSearch, IconCheck, IconAlertCircle } from '@/components/ui/Icons';
import { validatePhoneNumber } from '@/lib/util/phoneValidation';
import './PhoneInput.css';

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  error?: string;
  onError?: (error: string | null) => void;
  className?: string;
  disabled?: boolean;
  autoValidate?: boolean;
}

const INDIA = COUNTRIES.find((c) => c.code === 'IN') ?? COUNTRIES[0];
const SORTED_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

/**
 * Splits a stored phone string into {dialCode, number}. Handles both the
 * "+91 9876543210" format this component writes and legacy plain-digit
 * values ("9876543210") saved before it existed — those default to India.
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

export default function PhoneInput({
  value,
  onChange,
  placeholder,
  required = false,
  id,
  error: externalError,
  onError,
  className = '',
  disabled = false,
  autoValidate = true,
}: PhoneInputProps) {
  const { dialCode, number } = parsePhoneValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected country
  const selectedCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.dialCode === dialCode) || INDIA;
  }, [dialCode]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Run validation on change / blur
  const validateCurrent = (val: string, dial: string) => {
    if (!autoValidate && !onError) return;
    const res = validatePhoneNumber(val, { required, dialCode: dial });
    setInternalError(res.error);
    if (onError) {
      onError(res.error);
    }
  };

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectCountry = (country: CountryOption) => {
    const newVal = formatPhoneValue(country.dialCode, number);
    onChange(newVal);
    setIsOpen(false);
    setSearchQuery('');
    if (touched) {
      validateCurrent(newVal, country.dialCode);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    // Check if the user pasted a full international number with a '+'
    if (inputVal.trim().startsWith('+')) {
      const match = SORTED_BY_DIAL_LENGTH.find((c) => inputVal.trim().startsWith(c.dialCode));
      if (match) {
        const rawAfterDial = inputVal.trim().slice(match.dialCode.length).replace(/[^\d\s\-]/g, '');
        const newVal = formatPhoneValue(match.dialCode, rawAfterDial);
        onChange(newVal);
        if (touched) validateCurrent(newVal, match.dialCode);
        return;
      }
    }

    // Sanitize: allow only digits, spaces, and hyphens (reject letters / special symbols)
    let sanitized = inputVal.replace(/[^\d\s\-]/g, '');

    // For India (+91), restrict subscriber number to max 10 digits
    const digitsOnly = sanitized.replace(/\D/g, '');
    if (selectedCountry.code === 'IN' && digitsOnly.length > 10) {
      // Truncate to first 10 digits
      const truncatedDigits = digitsOnly.slice(0, 10);
      sanitized = `${truncatedDigits.slice(0, 5)} ${truncatedDigits.slice(5)}`.trim();
    } else if (selectedCountry.code !== 'IN' && digitsOnly.length > 15) {
      // Global max 15 digits (E.164)
      sanitized = digitsOnly.slice(0, 15);
    }

    const newVal = formatPhoneValue(dialCode, sanitized);
    onChange(newVal);

    if (touched) {
      validateCurrent(newVal, dialCode);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validateCurrent(value, dialCode);
  };

  // Determine active error to display
  const activeError = externalError || (touched ? internalError : null);

  return (
    <div className={`phone-input-wrapper ${className}`}>
      <div className={`phone-input ${activeError ? 'phone-input--error' : ''}`}>
        {/* Custom Smooth Country Dropdown */}
        <div className="phone-input__dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            className={`phone-input__country-trigger ${isOpen ? 'open' : ''}`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            aria-label="Select Country Code"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="phone-input__country-text">
              {selectedCountry.code} ({selectedCountry.dialCode})
            </span>
            <IconChevronDown size={13} className={`phone-input__chevron ${isOpen ? 'open' : ''}`} />
          </button>

          {isOpen && (
            <div className="phone-input__dropdown-menu" role="listbox">
              {/* Search Country Input */}
              <div className="phone-input__search-box">
                <IconSearch size={13} className="phone-input__search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="phone-input__search-field"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Countries List */}
              <div className="phone-input__options-list">
                {filteredCountries.length === 0 ? (
                  <div className="phone-input__no-results">No countries found</div>
                ) : (
                  filteredCountries.map((c) => {
                    const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode;
                    return (
                      <button
                        key={`${c.code}-${c.dialCode}`}
                        type="button"
                        className={`phone-input__option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectCountry(c)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="phone-input__option-name">
                          <span>{c.name}</span>
                        </div>
                        <div className="phone-input__option-right">
                          <span className="phone-input__dial-badge">{c.dialCode}</span>
                          {isSelected && <IconCheck size={13} className="phone-input__check" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Number Input Field */}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          className="phone-input__number"
          value={number}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          placeholder={placeholder || (selectedCountry.code === 'IN' ? '98765 43210' : 'Phone number')}
          required={required}
          disabled={disabled}
        />
      </div>

      {/* Inline Validation Error Message */}
      {activeError && (
        <div className="phone-input__error-msg">
          <IconAlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
