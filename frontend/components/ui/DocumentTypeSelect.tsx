'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DOCUMENT_TYPE_OPTIONS, DocumentTypeOption } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX } from '@/components/ui/Icons';
import './DocumentTypeSelect.css';

export interface DocumentTypeSelectProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export default function DocumentTypeSelect({
  value,
  onChange,
  label,
  placeholder = 'Select document type',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  error,
  size = 'md',
  'aria-label': ariaLabel,
}: DocumentTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return DOCUMENT_TYPE_OPTIONS.find(
      (opt) => opt.value.toLowerCase() === value.toLowerCase()
    );
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return DOCUMENT_TYPE_OPTIONS;
    const q = searchQuery.toLowerCase().trim();
    return DOCUMENT_TYPE_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.category.toLowerCase().includes(q)
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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`craly-doc-select-wrapper ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="craly-doc-select-label">
          {label}
          {required && <span className="craly-doc-select-required">*</span>}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      <button
        id={id}
        type="button"
        className={`craly-doc-select-trigger craly-doc-select-trigger--${size} ${
          isOpen ? 'craly-doc-select-trigger--open' : ''
        } ${error ? 'craly-doc-select-trigger--error' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || 'Select document type'}
      >
        <span className="craly-doc-select-content">
          {selectedOption ? (
            <span className="craly-doc-selected-view">
              <span className="craly-doc-selected-name">{selectedOption.label}</span>
              <span className="craly-doc-category-tag">{selectedOption.category}</span>
            </span>
          ) : (
            <span className="craly-doc-placeholder">{value || placeholder}</span>
          )}
        </span>
        <IconChevronDown
          size={14}
          className={`craly-doc-chevron ${isOpen ? 'craly-doc-chevron--rotated' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="craly-doc-menu" role="listbox" tabIndex={-1}>
          <div className="craly-doc-search-box">
            <IconSearch size={14} className="craly-doc-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="craly-doc-search-input"
              placeholder="Search document type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="craly-doc-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <IconX size={12} />
              </button>
            )}
          </div>

          <div className="craly-doc-list">
            {filteredOptions.length === 0 ? (
              <div className="craly-doc-empty">No matching document types found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = (value || '').toLowerCase() === option.value.toLowerCase();
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`craly-doc-option ${isSelected ? 'craly-doc-option--selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="craly-doc-option-text">
                      <span className="craly-doc-option-label">{option.label}</span>
                      <span className="craly-doc-badge-pill">{option.category}</span>
                    </div>
                    {isSelected && <IconCheck size={14} className="craly-doc-check" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="craly-doc-error-msg">{error}</p>}
    </div>
  );
}
