'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { INDUSTRIES, POPULAR_INDUSTRIES, type Industry } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX, IconBriefcase } from '@/components/ui/Icons';
import './IndustrySelect.css';

export interface IndustrySelectProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  showPopularChips?: boolean;
  allowCustom?: boolean;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
}

export default function IndustrySelect({
  value,
  onChange,
  label,
  placeholder = 'Select Industry / Sector',
  disabled = false,
  required = false,
  clearable = true,
  showPopularChips = false,
  allowCustom = true,
  id,
  name,
  className = '',
  error,
}: IndustrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnteringCustom, setIsEnteringCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isPreset = useMemo(() => {
    if (!value) return false;
    return INDUSTRIES.some((ind) => ind.toLowerCase() === value.toLowerCase());
  }, [value]);

  const filteredIndustries = useMemo(() => {
    if (!searchQuery.trim()) return INDUSTRIES;
    const q = searchQuery.toLowerCase().trim();
    return INDUSTRIES.filter((ind) => ind.toLowerCase().includes(q));
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setIsEnteringCustom(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
        setIsEnteringCustom(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        if (isEnteringCustom) {
          customInputRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isEnteringCustom]);

  const handleSelect = (ind: string) => {
    onChange(ind);
    setIsOpen(false);
    setSearchQuery('');
    setIsEnteringCustom(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsEnteringCustom(false);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue('');
      setIsEnteringCustom(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`craly-industry-select-wrap ${className}`} ref={dropdownRef}>
      {label && (
        <label className="craly-industry-label" htmlFor={id}>
          {label} {required && <span className="craly-industry-req">*</span>}
        </label>
      )}

      {showPopularChips && (
        <div className="craly-industry-chips">
          {POPULAR_INDUSTRIES.slice(0, 6).map((pop) => (
            <button
              key={pop}
              type="button"
              className={`craly-industry-chip ${value === pop ? 'craly-industry-chip--active' : ''}`}
              onClick={() => handleSelect(pop)}
              disabled={disabled}
            >
              {pop}
            </button>
          ))}
        </div>
      )}

      <div
        className={`craly-industry-trigger ${isOpen ? 'craly-industry-trigger--open' : ''} ${
          disabled ? 'craly-industry-trigger--disabled' : ''
        } ${error ? 'craly-industry-trigger--error' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="craly-industry-trigger-left">
          <IconBriefcase size={15} className="craly-industry-icon" />
          <span
            className={`craly-industry-val ${!value ? 'craly-industry-val--placeholder' : ''}`}
          >
            {value ? value : placeholder}
          </span>
          {value && !isPreset && (
            <span className="craly-industry-custom-tag" title="Custom Industry">
              Custom
            </span>
          )}
        </div>

        <div className="craly-industry-trigger-right">
          {clearable && value && !disabled && (
            <button
              type="button"
              className="craly-industry-clear-btn"
              onClick={handleClear}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <IconX size={13} />
            </button>
          )}
          <IconChevronDown
            size={14}
            className={`craly-industry-chevron ${isOpen ? 'craly-industry-chevron--rotated' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="craly-industry-popover" role="listbox">
          {!isEnteringCustom ? (
            <>
              <div className="craly-industry-search-bar" onClick={(e) => e.stopPropagation()}>
                <IconSearch size={14} className="craly-industry-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="craly-industry-search-input"
                  placeholder="Search industries, manufacturing sectors…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredIndustries.length > 0) {
                        handleSelect(filteredIndustries[0]);
                      } else if (allowCustom && searchQuery.trim()) {
                        handleSelect(searchQuery.trim());
                      }
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="craly-industry-clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>

              <div className="craly-industry-list">
                {filteredIndustries.length === 0 ? (
                  <div className="craly-industry-empty">
                    <span>No matching industry found for "{searchQuery}".</span>
                    {allowCustom && (
                      <button
                        type="button"
                        className="craly-industry-use-query-btn"
                        onClick={() => handleSelect(searchQuery.trim())}
                      >
                        Use "{searchQuery.trim()}" as custom industry
                      </button>
                    )}
                  </div>
                ) : (
                  filteredIndustries.map((ind) => {
                    const isSelected = value.toLowerCase() === ind.toLowerCase();
                    return (
                      <button
                        key={ind}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`craly-industry-option ${
                          isSelected ? 'craly-industry-option--selected' : ''
                        }`}
                        onClick={() => handleSelect(ind)}
                      >
                        <span className="craly-industry-opt-label">{ind}</span>
                        {isSelected && <IconCheck size={14} className="craly-industry-check" />}
                      </button>
                    );
                  })
                )}
              </div>

              {allowCustom && (
                <div className="craly-industry-custom-footer">
                  <button
                    type="button"
                    className="craly-industry-custom-trigger-btn"
                    onClick={() => {
                      setCustomValue(searchQuery || '');
                      setIsEnteringCustom(true);
                    }}
                  >
                    + Enter Other / Custom Industry
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="craly-industry-custom-panel" onClick={(e) => e.stopPropagation()}>
              <div className="craly-industry-custom-header">
                <strong>Specify Custom Industry / Sector</strong>
                <button
                  type="button"
                  className="craly-industry-custom-back"
                  onClick={() => setIsEnteringCustom(false)}
                >
                  ← Back to list
                </button>
              </div>
              <form onSubmit={handleApplyCustom} className="craly-industry-custom-form">
                <input
                  ref={customInputRef}
                  type="text"
                  className="craly-industry-custom-input"
                  placeholder="e.g. Precision CNC Tooling, Green Hydrogen"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  autoFocus
                />
                <div className="craly-industry-custom-actions">
                  <button
                    type="button"
                    className="craly-industry-custom-cancel"
                    onClick={() => setIsEnteringCustom(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="craly-industry-custom-submit"
                    disabled={!customValue.trim()}
                  >
                    Apply Industry
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {error && <span className="craly-industry-error-msg">{error}</span>}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
