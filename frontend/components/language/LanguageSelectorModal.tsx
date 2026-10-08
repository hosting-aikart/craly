'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ALL_LANGUAGES, normalizeLanguageCode, type SupportedLanguage } from '@/lib/i18n/languages';
import { changeGoogleTranslateLanguage } from './GoogleTranslateScript';
import { IconCheck } from '@/components/ui/Icons';
import './LanguageSelectorModal.css';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectLanguage: (code: SupportedLanguage) => void;
}

export default function LanguageSelectorModal({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
}: LanguageSelectorModalProps) {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return ALL_LANGUAGES;
    const q = search.toLowerCase().trim();
    return ALL_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = (code: string) => {
    const target = normalizeLanguageCode(code);
    onSelectLanguage(target);
    changeGoogleTranslateLanguage(target);
    onClose();
  };

  return (
    <div className="lsm-backdrop" onClick={onClose}>
      <div className="lsm-container" onClick={(e) => e.stopPropagation()}>
        <div className="lsm-header">
          <div className="lsm-header-text">
            <span className="lsm-eyebrow">🌐 Supported Languages</span>
            <h3 className="lsm-title">Select Language</h3>
          </div>
          <button type="button" className="lsm-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="lsm-search-box">
          <span className="lsm-search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="lsm-search-input"
            placeholder="Search language (English, हिन्दी, मराठी)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="lsm-search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>

        {/* Full Language Grid */}
        <div className="lsm-list-section">
          <span className="lsm-section-label">
            {search.trim() ? `Search Results (${filteredLanguages.length})` : `Supported Languages (${ALL_LANGUAGES.length})`}
          </span>

          {filteredLanguages.length === 0 ? (
            <div className="lsm-empty">
              <span>🌐</span>
              <p>No languages match &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="lsm-languages-grid">
              {filteredLanguages.map((l) => {
                const active = currentLanguage === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    className={`lsm-lang-card ${active ? 'lsm-lang-card--active' : ''}`}
                    onClick={() => handleSelect(l.code)}
                  >
                    <div className="lsm-lang-info">
                      <span className="lsm-lang-name">{l.name}</span>
                      <span className="lsm-lang-native">{l.nativeName}</span>
                    </div>
                    {active && <IconCheck size={16} className="lsm-check-icon" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
