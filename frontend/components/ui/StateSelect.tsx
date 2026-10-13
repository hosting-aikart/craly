'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  getStatesForCountry,
  normalizeIndianState,
  getCountryCode,
} from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX } from '@/components/ui/Icons';
import './IndianStateSelect.css';

export interface StateSelectProps {
  /**
   * Country code or name (e.g. 'IN', 'US', 'CA', 'GB', 'India', 'United States').
   * Defaults to 'IN'.
   */
  countryCode?: string;
  value: string;
  onChange: (state: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
  'aria-label'?: string;
}

export default function StateSelect({
  countryCode = 'IN',
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  clearable = false,
  id,
  name,
  className = '',
  error,
  'aria-label': ariaLabel,
}: StateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedCode = useMemo(() => getCountryCode(countryCode), [countryCode]);
  const statesList = useMemo(() => getStatesForCountry(countryCode), [countryCode]);
  const hasDropdown = statesList.length > 0;

  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (normalizedCode === 'IN') return 'Select Indian State / UT';
    if (normalizedCode === 'US') return 'Select US State';
    return 'Select State / Province';
  }, [placeholder, normalizedCode]);

  // Normalize displayed value if in India
  const canonicalValue = useMemo(() => {
    if (!value) return '';
    if (normalizedCode === 'IN') {
      const normalized = normalizeIndianState(value);
      return normalized || value;
    }
    // Match against country's state list if available
    const matched = statesList.find((s) => s.toLowerCase() === value.trim().toLowerCase());
    return matched || value;
  }, [value, normalizedCode, statesList]);

  // Filter states based on search query
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return statesList;
    const q = searchQuery.toLowerCase().trim();
    return statesList.filter((s) => s.toLowerCase().includes(q));
  }, [statesList, searchQuery]);

  // Close dropdown on outside click or escape
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

  const handleSelect = (stateName: string) => {
    onChange(stateName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  // If this country has no predefined states, provide a clean text input
  if (!hasDropdown) {
    return (
      <div className={`craly-state-select ${disabled ? 'craly-state-select--disabled' : ''} ${error ? 'craly-state-select--error' : ''} ${className}`}>
        {label && (
          <label className="craly-select-label" htmlFor={id}>
            {label}
            {required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
        )}
        <input
          id={id}
          name={name}
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultPlaceholder || 'Enter state / province'}
          className="craly-state-select__trigger"
          style={{ width: '100%', cursor: 'text' }}
        />
        {error && <span className="craly-state-select__error-msg">{error}</span>}
      </div>
    );
  }

  return (
    <div
      className={`craly-state-select ${disabled ? 'craly-state-select--disabled' : ''} ${error ? 'craly-state-select--error' : ''} ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="craly-select-label" htmlFor={id}>
          {label}
          {required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
      )}

      {/* Hidden input to support native form submissions */}
      {name && <input type="hidden" name={name} value={canonicalValue} />}

      <button
        id={id}
        type="button"
        disabled={disabled}
        className={`craly-state-select__trigger ${isOpen ? 'craly-state-select__trigger--open' : ''} ${canonicalValue ? 'has-value' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || defaultPlaceholder}
      >
        <span className="craly-state-select__value">
          {canonicalValue || <span className="craly-state-select__placeholder">{defaultPlaceholder}</span>}
        </span>

        <div className="craly-state-select__actions">
          {clearable && canonicalValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="craly-state-select__clear-btn"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              title="Clear selection"
            >
              <IconX size={14} />
            </span>
          )}
          <IconChevronDown
            size={16}
            className={`craly-state-select__chevron ${isOpen ? 'craly-state-select__chevron--open' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="craly-state-select__menu" role="listbox">
          <div className="craly-state-select__search">
            <IconSearch size={14} className="craly-state-select__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state..."
              className="craly-state-select__search-input"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="craly-state-select__search-clear"
                onClick={() => setSearchQuery('')}
              >
                <IconX size={12} />
              </button>
            )}
          </div>

          <div className="craly-state-select__list">
            {filteredStates.length > 0 ? (
              filteredStates.map((stateItem) => {
                const isSelected = canonicalValue.toLowerCase() === stateItem.toLowerCase();
                return (
                  <button
                    key={stateItem}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`craly-state-select__option ${isSelected ? 'craly-state-select__option--selected' : ''}`}
                    onClick={() => handleSelect(stateItem)}
                  >
                    <span>{stateItem}</span>
                    {isSelected && <IconCheck size={14} className="craly-state-select__check" />}
                  </button>
                );
              })
            ) : (
              <div className="craly-state-select__empty">
                No states found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {error && <span className="craly-state-select__error-msg">{error}</span>}
    </div>
  );
}
