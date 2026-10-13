'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VERIFICATION_STATUS_OPTIONS } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconCheck } from '@/components/ui/Icons';
import './VerificationStatusSelect.css';

export interface VerificationStatusSelectProps {
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

export default function VerificationStatusSelect({
  value,
  onChange,
  label,
  placeholder = 'Select verification status',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  error,
  size = 'md',
  'aria-label': ariaLabel,
}: VerificationStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = VERIFICATION_STATUS_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === (value || '').toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`craly-verify-select-wrapper ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="craly-verify-select-label">
          {label}
          {required && <span className="craly-verify-select-required">*</span>}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      <button
        id={id}
        type="button"
        className={`craly-verify-select-trigger craly-verify-select-trigger--${size} ${
          isOpen ? 'craly-verify-select-trigger--open' : ''
        } ${error ? 'craly-verify-select-trigger--error' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || 'Select verification status'}
      >
        <span className="craly-verify-select-content">
          {selectedOption ? (
            <span className="craly-verify-pill">
              <span
                className="craly-verify-dot"
                style={{ backgroundColor: selectedOption.dotColor }}
              />
              <span className="craly-verify-text">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="craly-verify-placeholder">{value || placeholder}</span>
          )}
        </span>
        <IconChevronDown
          size={14}
          className={`craly-verify-chevron ${
            isOpen ? 'craly-verify-chevron--rotated' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="craly-verify-menu" role="listbox" tabIndex={-1}>
          <div className="craly-verify-list">
            {VERIFICATION_STATUS_OPTIONS.map((option) => {
              const isSelected =
                (value || '').toLowerCase() === option.value.toLowerCase();
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`craly-verify-option ${
                    isSelected ? 'craly-verify-option--selected' : ''
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="craly-verify-option-left">
                    <span
                      className="craly-verify-dot"
                      style={{ backgroundColor: option.dotColor }}
                    />
                    <span className="craly-verify-option-label">{option.label}</span>
                  </span>
                  {isSelected && (
                    <IconCheck size={14} className="craly-verify-check" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="craly-verify-error-msg">{error}</p>}
    </div>
  );
}
