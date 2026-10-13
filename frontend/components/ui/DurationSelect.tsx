'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ENGAGEMENT_DURATIONS } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconCheck } from '@/components/ui/Icons';
import './DurationSelect.css';

export interface DurationSelectProps {
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
  allowCustom?: boolean;
  'aria-label'?: string;
}

export default function DurationSelect({
  value,
  onChange,
  label,
  placeholder = 'Select duration (e.g. 6 Months)',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  error,
  allowCustom = true,
  'aria-label': ariaLabel,
}: DurationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isPredefined = ENGAGEMENT_DURATIONS.some(
    (d) => d.toLowerCase() === (value || '').toLowerCase()
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

  const handleSelect = (duration: string) => {
    if (duration === 'Custom Duration') {
      setIsCustomMode(true);
      setIsOpen(false);
      setTimeout(() => customInputRef.current?.focus(), 50);
      return;
    }
    setIsCustomMode(false);
    onChange(duration);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customVal.trim()) {
      onChange(customVal.trim());
    }
  };

  return (
    <div className={`craly-duration-select-wrapper ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="craly-duration-select-label">
          {label}
          {required && <span className="craly-duration-select-required">*</span>}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      {isCustomMode ? (
        <div className="craly-duration-custom-row">
          <input
            ref={customInputRef}
            type="text"
            className="craly-duration-custom-input"
            placeholder="Type custom duration (e.g. 45 Days, 18 Months)"
            value={customVal || value}
            onChange={(e) => {
              setCustomVal(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={handleCustomSubmit}
          />
          <button
            type="button"
            className="craly-duration-switch-btn"
            onClick={() => {
              setIsCustomMode(false);
              setIsOpen(true);
            }}
          >
            Presets
          </button>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          className={`craly-duration-select-trigger ${
            isOpen ? 'craly-duration-select-trigger--open' : ''
          } ${error ? 'craly-duration-select-trigger--error' : ''}`}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={ariaLabel || label || 'Select project duration'}
        >
          <span className="craly-duration-select-value">
            {value ? (
              <span className="craly-duration-text">{value}</span>
            ) : (
              <span className="craly-duration-placeholder">{placeholder}</span>
            )}
          </span>
          <IconChevronDown
            size={14}
            className={`craly-duration-chevron ${
              isOpen ? 'craly-duration-chevron--rotated' : ''
            }`}
          />
        </button>
      )}

      {isOpen && !isCustomMode && (
        <div className="craly-duration-menu" role="listbox" tabIndex={-1}>
          <div className="craly-duration-list">
            {ENGAGEMENT_DURATIONS.map((opt) => {
              const isSelected = value.toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`craly-duration-option ${
                    isSelected ? 'craly-duration-option--selected' : ''
                  }`}
                  onClick={() => handleSelect(opt)}
                >
                  <span className="craly-duration-option-label">{opt}</span>
                  {isSelected && (
                    <IconCheck size={14} className="craly-duration-check" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="craly-duration-error-msg">{error}</p>}
    </div>
  );
}
