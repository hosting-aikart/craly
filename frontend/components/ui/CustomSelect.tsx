'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck } from '@/components/ui/Icons';
import './CustomSelect.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
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
    <div className={`custom-select ${className} ${isOpen ? 'custom-select--open' : ''}`} ref={selectRef}>
      <button
        type="button"
        className="custom-select__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-select__value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <IconChevronDown
          size={14}
          className={`custom-select__chevron ${isOpen ? 'custom-select__chevron--rotated' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="custom-select__popover" role="listbox" tabIndex={-1}>
          <div className="custom-select__list">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select__option ${isSelected ? 'custom-select__option--selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="custom-select__option-label">{option.label}</span>
                  {isSelected && <IconCheck size={14} className="custom-select__check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
