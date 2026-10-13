'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SKILLS, POPULAR_SKILLS, normalizeSkill, type Skill } from '@/lib/constants/geoAndSkills';
import { IconChevronDown, IconSearch, IconCheck, IconX, IconPlus } from '@/components/ui/Icons';
import './SkillMultiSelect.css';

export interface SkillMultiSelectProps {
  value: string[] | string;
  onChange: (skills: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showPopularPresets?: boolean;
  popularSkills?: string[];
  className?: string;
  id?: string;
  name?: string;
  error?: string;
  maxSelected?: number;
}

export default function SkillMultiSelect({
  value,
  onChange,
  label,
  placeholder = 'Search & select trade skills…',
  disabled = false,
  required = false,
  showPopularPresets = true,
  popularSkills,
  className = '',
  id,
  name,
  error,
  maxSelected,
}: SkillMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize input value (array or comma-separated string)
  const selectedSkills = useMemo(() => {
    if (Array.isArray(value)) {
      return value.map((s) => (typeof s === 'string' ? normalizeSkill(s) || s.trim() : '')).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((s) => normalizeSkill(s) || s.trim())
        .filter(Boolean);
    }
    return [];
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

  const toggleSkill = (skill: string) => {
    const isSelected = selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (isSelected) {
      onChange(selectedSkills.filter((s) => s.toLowerCase() !== skill.toLowerCase()));
    } else {
      if (maxSelected && selectedSkills.length >= maxSelected) return;
      onChange([...selectedSkills, skill]);
    }
  };

  const addSkill = (skill: string) => {
    if (!selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      if (maxSelected && selectedSkills.length >= maxSelected) return;
      onChange([...selectedSkills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    onChange(selectedSkills.filter((s) => s.toLowerCase() !== skill.toLowerCase()));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Popular presets that haven't been selected yet
  const availablePopular = useMemo(() => {
    const pool = popularSkills && popularSkills.length > 0 ? popularSkills : POPULAR_SKILLS;
    return pool.filter(
      (preset) => !selectedSkills.some((s) => s.toLowerCase() === preset.toLowerCase()),
    );
  }, [selectedSkills, popularSkills]);

  return (
    <div
      className={`craly-skills-multiselect ${disabled ? 'disabled' : ''} ${error ? 'has-error' : ''} ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="craly-select-label" htmlFor={id}>
          {label}
          {required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
      )}

      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedSkills.join(', ')}
          required={required && selectedSkills.length === 0}
        />
      )}

      {/* Main Select Trigger Box */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`craly-skills-multiselect__box ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="craly-skills-multiselect__tags">
          {selectedSkills.length > 0 ? (
            selectedSkills.map((sk) => (
              <span key={sk} className="craly-skills-multiselect__tag">
                <span className="craly-skills-multiselect__tag-label">{sk}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="craly-skills-multiselect__tag-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSkill(sk);
                    }}
                    title={`Remove ${sk}`}
                    aria-label={`Remove ${sk}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="craly-skills-multiselect__placeholder">{placeholder}</span>
          )}
        </div>

        <div className="craly-skills-multiselect__controls">
          {selectedSkills.length > 0 && !disabled && (
            <button
              type="button"
              className="craly-skills-multiselect__clear-all"
              onClick={clearAll}
              title="Clear all selected skills"
            >
              <IconX size={13} />
            </button>
          )}
          <IconChevronDown
            size={16}
            className={`craly-skills-multiselect__chevron ${isOpen ? 'open' : ''}`}
          />
        </div>
      </div>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="craly-skills-multiselect__popover" role="listbox">
          <div className="craly-skills-multiselect__search-wrap">
            <IconSearch size={14} className="craly-skills-multiselect__search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="craly-skills-multiselect__search-input"
              placeholder="Search from 40+ recognized trade skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredSkills.length > 0) {
                  e.preventDefault();
                  toggleSkill(filteredSkills[0]);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="craly-skills-multiselect__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="craly-skills-multiselect__list">
            {filteredSkills.length > 0 ? (
              filteredSkills.map((sk) => {
                const isSelected = selectedSkills.some((s) => s.toLowerCase() === sk.toLowerCase());
                return (
                  <button
                    key={sk}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`craly-skills-multiselect__item ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSkill(sk);
                    }}
                  >
                    <span className="craly-skills-multiselect__item-label">{sk}</span>
                    {isSelected && <IconCheck size={14} className="craly-skills-multiselect__check" />}
                  </button>
                );
              })
            ) : (
              <div className="craly-skills-multiselect__empty">
                No matching trade skill found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick-Add Popular Preset Skills Bar */}
      {showPopularPresets && !disabled && availablePopular.length > 0 && (
        <div className="craly-skills-multiselect__presets">
          <span className="craly-skills-multiselect__presets-label">Popular trades:</span>
          <div className="craly-skills-multiselect__presets-list">
            {availablePopular.slice(0, 8).map((preset) => (
              <button
                key={preset}
                type="button"
                className="craly-skills-multiselect__preset-chip"
                onClick={() => addSkill(preset)}
                title={`Click to add ${preset}`}
              >
                <IconPlus size={11} className="craly-skills-multiselect__preset-icon" />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <span className="craly-skills-multiselect__error-msg">{error}</span>}
    </div>
  );
}
