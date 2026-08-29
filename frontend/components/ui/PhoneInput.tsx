'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, type CountryOption } from '@/lib/util/countries';
import { IconChevronDown, IconSearch, IconCheck } from '@/components/ui/Icons';
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

export default function PhoneInput({ value, onChange, placeholder, required, id }: PhoneInputProps) {
  const { dialCode, number } = parsePhoneValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      // Auto focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectCountry = (country: CountryOption) => {
    onChange(formatPhoneValue(country.dialCode, number));
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneValue(dialCode, e.target.value));
  };

  return (
    <div className="phone-input">
      {/* Custom Smooth Country Dropdown */}
      <div className="phone-input__dropdown-wrap" ref={dropdownRef}>
        <button
          type="button"
          className={`phone-input__country-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
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
        placeholder={placeholder || '98765 43210'}
        required={required}
      />
    </div>
  );
}
