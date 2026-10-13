'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  INDIAN_STATES,
  normalizeIndianState,
} from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX } from '@/components/ui/Icons';
import './IndianStateMultiSelect.css';

export interface IndianStateMultiSelectProps {
  value: string[];
  onChange: (states: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  error?: string;
  maxSelected?: number;
}

export default function IndianStateMultiSelect({
  value = [],
  onChange,
  placeholder = 'Select Indian States / UTs…',
  disabled = false,
  id,
  className = '',
  error,
  maxSelected,
}: IndianStateMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Canonicalize selected list
  const selectedList = useMemo(() => {
    if (!Array.isArray(value)) return [];
    return value.map((v) => normalizeIndianState(v) || v);
  }, [value]);

  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return INDIAN_STATES;
    const q = searchQuery.toLowerCase().trim();
    return INDIAN_STATES.filter((s) => s.toLowerCase().includes(q));
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

  const toggleState = (st: string) => {
    const isSelected = selectedList.some((s) => s.toLowerCase() === st.toLowerCase());
    if (isSelected) {
      onChange(selectedList.filter((s) => s.toLowerCase() !== st.toLowerCase()));
    } else {
      if (maxSelected && selectedList.length >= maxSelected) return;
      onChange([...selectedList, st]);
    }
  };

  const removeState = (st: string) => {
    onChange(selectedList.filter((s) => s.toLowerCase() !== st.toLowerCase()));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div
      className={`craly-states-multiselect ${disabled ? 'disabled' : ''} ${error ? 'has-error' : ''} ${className}`}
      ref={dropdownRef}
    >
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`craly-states-multiselect__box ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="craly-states-multiselect__tags">
          {selectedList.length > 0 ? (
            selectedList.map((st) => (
              <span key={st} className="craly-states-multiselect__tag">
                <span>{st}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="craly-states-multiselect__tag-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeState(st);
                    }}
                    title={`Remove ${st}`}
                    aria-label={`Remove ${st}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="craly-states-multiselect__placeholder">{placeholder}</span>
          )}
        </div>

        <div className="craly-states-multiselect__controls">
          {selectedList.length > 0 && !disabled && (
            <button
              type="button"
              className="craly-states-multiselect__clear-all"
              onClick={clearAll}
              title="Clear all"
            >
              <IconX size={13} />
            </button>
          )}
          <IconChevronDown
            size={16}
            className={`craly-states-multiselect__chevron ${isOpen ? 'open' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="craly-states-multiselect__popover" role="listbox">
          <div className="craly-states-multiselect__search-wrap">
            <IconSearch size={14} className="craly-states-multiselect__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="craly-states-multiselect__search-input"
              placeholder="Search Indian States…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="craly-states-multiselect__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="craly-states-multiselect__list">
            {filteredStates.map((st) => {
              const isSelected = selectedList.some((s) => s.toLowerCase() === st.toLowerCase());
              return (
                <button
                  key={st}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`craly-states-multiselect__item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleState(st);
                  }}
                >
                  <span className="craly-states-multiselect__item-label">{st}</span>
                  {isSelected && <IconCheck size={14} className="craly-states-multiselect__check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <span className="craly-states-multiselect__error-msg">{error}</span>}
    </div>
  );
}
