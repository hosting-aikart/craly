'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CONTRACTOR_CLASSES,
  CONTRACTOR_CLASS_DETAILS,
  type ContractorClass,
} from '@/lib/constants/contractorClass';
import { IconChevronDown, IconCheck, IconShield, IconBriefcase } from '@/components/ui/Icons';
import './ContractorClassSelect.css';

export interface ContractorClassSelectProps {
  value: string;
  onChange: (val: ContractorClass) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  showEligibilityTable?: boolean;
  className?: string;
  id?: string;
}

export default function ContractorClassSelect({
  value,
  onChange,
  label = 'Class',
  required = false,
  disabled = false,
  error,
  showEligibilityTable = true,
  className = '',
  id = 'contractor-class-select',
}: ContractorClassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedClass = CONTRACTOR_CLASSES.includes(value as ContractorClass)
    ? (value as ContractorClass)
    : undefined;

  const selectedDetails = selectedClass ? CONTRACTOR_CLASS_DETAILS[selectedClass] : null;

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

  const handleSelect = (cls: ContractorClass) => {
    onChange(cls);
    setIsOpen(false);
  };

  return (
    <div className={`contractor-class-select-container ${className}`}>
      {label && (
        <div className="contractor-class-header">
          <label htmlFor={id} className="contractor-class-label">
            <IconShield size={14} className="inline-icon" />
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          {showEligibilityTable && (
            <button
              type="button"
              className="contractor-class-toggle-info-btn"
              onClick={() => setIsPanelVisible((v) => !v)}
              aria-expanded={isPanelVisible}
            >
              {isPanelVisible ? 'Hide Eligibility Guide' : 'View Eligibility Criteria'}
            </button>
          )}
        </div>
      )}

      {/* Custom Dropdown Trigger */}
      <div
        className={`contractor-class-dropdown ${isOpen ? 'contractor-class-dropdown--open' : ''}`}
        ref={dropdownRef}
      >
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`contractor-class-trigger ${error ? 'contractor-class-trigger--error' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-required={required}
        >
          <div className="contractor-class-trigger-content">
            {selectedDetails ? (
              <>
                <span
                  className="contractor-class-trigger-badge"
                  style={{
                    color: selectedDetails.badgeColor,
                    backgroundColor: selectedDetails.badgeBg,
                  }}
                >
                  {selectedDetails.title}
                </span>
                <span className="contractor-class-trigger-text">
                  Bidding Capacity: {selectedDetails.bidLimit}
                </span>
                <span className="contractor-class-trigger-hint">
                  • Solvency: {selectedDetails.solvency}
                </span>
              </>
            ) : (
              <span className="contractor-class-placeholder">
                Select Contractor Class (Class I, II, III, or IV)…
              </span>
            )}
          </div>

          <IconChevronDown
            size={14}
            className={`contractor-class-chevron ${isOpen ? 'contractor-class-chevron--rotated' : ''}`}
          />
        </button>

        {/* Popover Options */}
        {isOpen && (
          <div className="contractor-class-popover" role="listbox" tabIndex={-1}>
            {CONTRACTOR_CLASSES.map((cls) => {
              const details = CONTRACTOR_CLASS_DETAILS[cls];
              const isSelected = cls === selectedClass;

              return (
                <button
                  key={cls}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`contractor-class-option ${isSelected ? 'contractor-class-option--selected' : ''}`}
                  onClick={() => handleSelect(cls)}
                >
                  <div className="contractor-class-option-left">
                    <span
                      className="contractor-class-trigger-badge"
                      style={{
                        color: details.badgeColor,
                        backgroundColor: details.badgeBg,
                      }}
                    >
                      {details.title}
                    </span>
                    <div>
                      <div className="contractor-class-option-name">
                        {details.title} — Work limit: {details.bidLimit}
                      </div>
                      <div className="contractor-class-option-sub">
                        Min Solvency: {details.solvency} • Avg Turnover: {details.turnover}
                      </div>
                    </div>
                  </div>
                  {isSelected && <IconCheck size={16} className="contractor-class-check" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <span className="contractor-class-error-text">{error}</span>}

      {/* Class Eligibility Comparison Table */}
      {showEligibilityTable && isPanelVisible && (
        <div className="contractor-class-panel">
          <div className="contractor-class-panel-header">
            <div className="contractor-class-panel-title">
              <IconBriefcase size={14} /> Class Eligibility & Prequalification Criteria
            </div>
            <span className="contractor-class-panel-sub">
              Click any column to select that Class
            </span>
          </div>

          <div className="contractor-class-table-wrap">
            <table className="contractor-class-table" aria-label="Contractor Class Eligibility Comparison">
              <thead>
                <tr>
                  <th className="col-req">Requirement</th>
                  {CONTRACTOR_CLASSES.map((cls) => {
                    const isSelected = cls === selectedClass;
                    return (
                      <th
                        key={cls}
                        className={`col-class ${isSelected ? 'col-class--active' : ''}`}
                        onClick={() => !disabled && handleSelect(cls)}
                        title={`Select ${cls}`}
                      >
                        <div className="contractor-class-th-header">
                          <span style={{ fontWeight: 800 }}>{cls}</span>
                          {isSelected && (
                            <span className="contractor-class-badge-selected">Selected</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="req-label">Can bid on works up to</td>
                  {CONTRACTOR_CLASSES.map((cls) => (
                    <td
                      key={cls}
                      className={`col-class ${cls === selectedClass ? 'col-class--active' : ''}`}
                      onClick={() => !disabled && handleSelect(cls)}
                    >
                      <strong style={{ color: '#0f172a' }}>
                        {CONTRACTOR_CLASS_DETAILS[cls].bidLimit}
                      </strong>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="req-label">Minimum bank solvency</td>
                  {CONTRACTOR_CLASSES.map((cls) => (
                    <td
                      key={cls}
                      className={`col-class ${cls === selectedClass ? 'col-class--active' : ''}`}
                      onClick={() => !disabled && handleSelect(cls)}
                    >
                      {CONTRACTOR_CLASS_DETAILS[cls].solvency}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="req-label">Average turnover (last 3 years)</td>
                  {CONTRACTOR_CLASSES.map((cls) => (
                    <td
                      key={cls}
                      className={`col-class ${cls === selectedClass ? 'col-class--active' : ''}`}
                      onClick={() => !disabled && handleSelect(cls)}
                    >
                      {CONTRACTOR_CLASS_DETAILS[cls].turnover}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="req-label">Technical staff required</td>
                  {CONTRACTOR_CLASSES.map((cls) => (
                    <td
                      key={cls}
                      className={`col-class ${cls === selectedClass ? 'col-class--active' : ''}`}
                      onClick={() => !disabled && handleSelect(cls)}
                      style={{ fontSize: '11px', color: '#475569' }}
                    >
                      {CONTRACTOR_CLASS_DETAILS[cls].technicalStaff}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
