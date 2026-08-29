'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, type CountryOption } from '@/lib/util/countries';
import { IconChevronDown, IconSearch, IconCheck } from '@/components/ui/Icons';
import './DialCodeSelect.css';

interface DialCodeSelectProps {
  value: CountryOption;
  onChange: (country: CountryOption) => void;
  id?: string;
}

export default function DialCodeSelect({ value, onChange, id }: DialCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelect = (country: CountryOption) => {
    onChange(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="custom-dial-select" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        className={`custom-dial-select__trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-dial-select__value">
          {value.code} ({value.dialCode})
        </span>
        <IconChevronDown
          size={14}
          className={`custom-dial-select__chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="custom-dial-select__menu" role="listbox">
          <div className="custom-dial-select__search-box">
            <IconSearch size={14} className="custom-dial-select__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="custom-dial-select__search-input"
              placeholder="Search code / country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="custom-dial-select__list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.code === value.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-dial-select__item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(country)}
                  >
                    <span className="custom-dial-select__item-code">{country.code}</span>
                    <span className="custom-dial-select__item-dial">{country.dialCode}</span>
                    <span className="custom-dial-select__item-name">{country.name}</span>
                    {isSelected && (
                      <IconCheck size={14} className="custom-dial-select__check" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="custom-dial-select__no-results">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
