'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AVAILABILITY_STATUS_OPTIONS, ContractorAvailabilityStatus } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconCheck } from '@/components/ui/Icons';
import './AvailabilitySelect.css';

export interface AvailabilitySelectProps {
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

export default function AvailabilitySelect({
  value,
  onChange,
  label,
  placeholder = 'Select availability status',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  error,
  size = 'md',
  'aria-label': ariaLabel,
}: AvailabilitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = AVAILABILITY_STATUS_OPTIONS.find(
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
    <div
      className={`craly-availability-select-wrapper ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label htmlFor={id} className="craly-availability-select-label">
          {label}
          {required && <span className="craly-availability-select-required">*</span>}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      <button
        id={id}
        type="button"
        className={`craly-availability-select-trigger craly-availability-select-trigger--${size} ${
          isOpen ? 'craly-availability-select-trigger--open' : ''
        } ${error ? 'craly-availability-select-trigger--error' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || 'Select contractor availability'}
      >
        <span className="craly-availability-select-content">
          {selectedOption ? (
            <span className="craly-availability-pill">
              <span
                className="craly-availability-dot"
                style={{ backgroundColor: selectedOption.dotColor }}
              />
              <span className="craly-availability-text">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="craly-availability-placeholder">{value || placeholder}</span>
          )}
        </span>
        <IconChevronDown
          size={14}
          className={`craly-availability-chevron ${
            isOpen ? 'craly-availability-chevron--rotated' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="craly-availability-menu" role="listbox" tabIndex={-1}>
          <div className="craly-availability-list">
            {AVAILABILITY_STATUS_OPTIONS.map((option) => {
              const isSelected =
                (value || '').toLowerCase() === option.value.toLowerCase();
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`craly-availability-option ${
                    isSelected ? 'craly-availability-option--selected' : ''
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="craly-availability-option-left">
                    <span
                      className="craly-availability-dot"
                      style={{ backgroundColor: option.dotColor }}
                    />
                    <span className="craly-availability-option-label">{option.label}</span>
                  </span>
                  {isSelected && (
                    <IconCheck size={14} className="craly-availability-check" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="craly-availability-error-msg">{error}</p>}
    </div>
  );
}
