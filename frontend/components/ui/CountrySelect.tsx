'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, type CountryOption } from '@/lib/util/countries';
import { IconChevronDown, IconSearch, IconCheck } from '@/components/ui/Icons';
import './CountrySelect.css';

interface CountrySelectProps {
  value: CountryOption;
  onChange: (country: CountryOption) => void;
  placeholder?: string;
  id?: string;
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = 'Select Country / Region',
  id,
}: CountrySelectProps) {
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
    <div className="custom-country-select" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        className={`custom-country-select__trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-country-select__value">
          {value ? value.name : placeholder}
        </span>
        <IconChevronDown
          size={16}
          className={`custom-country-select__chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="custom-country-select__menu" role="listbox">
          <div className="custom-country-select__search-box">
            <IconSearch size={14} className="custom-country-select__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="custom-country-select__search-input"
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="custom-country-select__list">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.code === value?.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-country-select__item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(country)}
                  >
                    <span className="custom-country-select__item-name">{country.name}</span>
                    <span className="custom-country-select__item-code">{country.code}</span>
                    {isSelected && (
                      <IconCheck size={14} className="custom-country-select__check" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="custom-country-select__no-results">No countries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
