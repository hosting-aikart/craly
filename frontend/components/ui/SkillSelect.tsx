'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SKILLS, normalizeSkill } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX } from '@/components/ui/Icons';
import './IndianStateSelect.css';

export interface SkillSelectProps {
  value: string;
  onChange: (skill: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  error?: string;
}

export default function SkillSelect({
  value,
  onChange,
  placeholder = 'Select Trade Skill',
  disabled = false,
  required = false,
  clearable = false,
  id,
  name,
  className = '',
  error,
}: SkillSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canonicalValue = useMemo(() => {
    if (!value) return '';
    return normalizeSkill(value) || value;
  }, [value]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return SKILLS;
    const q = searchQuery.toLowerCase().trim();
    return SKILLS.filter((s) => s.toLowerCase().includes(q));
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

  const handleSelect = (skill: string) => {
    onChange(skill);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div
      className={`craly-state-select ${disabled ? 'craly-state-select--disabled' : ''} ${error ? 'craly-state-select--error' : ''} ${className}`}
      ref={dropdownRef}
    >
      {name && <input type="hidden" name={name} value={canonicalValue} />}

      <button
        id={id}
        type="button"
        disabled={disabled}
        className={`craly-state-select__trigger ${isOpen ? 'craly-state-select__trigger--open' : ''} ${canonicalValue ? 'has-value' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="craly-state-select__value">
          {canonicalValue || <span className="craly-state-select__placeholder">{placeholder}</span>}
        </span>

        <div className="craly-state-select__actions">
          {clearable && canonicalValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="craly-state-select__clear-btn"
              onClick={handleClear}
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

      {isOpen && (
        <div className="craly-state-select__popover" role="listbox">
          <div className="craly-state-select__search-box">
            <IconSearch size={14} className="craly-state-select__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="craly-state-select__search-input"
              placeholder="Search trade skill…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredSkills.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredSkills[0]);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="craly-state-select__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="craly-state-select__list">
            {filteredSkills.length > 0 ? (
              filteredSkills.map((sk) => {
                const isSelected = canonicalValue.toLowerCase() === sk.toLowerCase();
                return (
                  <button
                    key={sk}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`craly-state-select__option ${isSelected ? 'craly-state-select__option--selected' : ''}`}
                    onClick={() => handleSelect(sk)}
                  >
                    <span className="craly-state-select__option-name">{sk}</span>
                    {isSelected && <IconCheck size={14} className="craly-state-select__option-check" />}
                  </button>
                );
              })
            ) : (
              <div className="craly-state-select__empty">
                No skill found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {error && <span className="craly-state-select__error-msg">{error}</span>}
    </div>
  );
}
