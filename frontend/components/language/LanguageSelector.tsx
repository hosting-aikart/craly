'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES, type Language } from '@/lib/i18n/translations';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  variant?: 'header' | 'mobile' | 'minimal';
}

export default function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className="mobile-lang-selector">
        <div className="mobile-lang-selector__options">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`mobile-lang-selector__option ${language === l.code ? 'mobile-lang-selector__option--active' : ''}`}
              onClick={() => handleSelect(l.code)}
            >
              {l.label} {language === l.code ? '✓' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`lang-selector lang-selector--${variant}`} ref={containerRef}>
      <button
        type="button"
        className={`lang-selector__trigger ${isOpen ? 'lang-selector__trigger--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span className="lang-selector__globe">🌐</span>
        <span className="lang-selector__current">{currentLang.label}</span>
        <span className="lang-selector__arrow">▾</span>
      </button>

      {isOpen && (
        <div className="lang-selector__dropdown" role="listbox" tabIndex={-1}>
          {LANGUAGES.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`lang-selector__item ${isSelected ? 'lang-selector__item--selected' : ''}`}
                onClick={() => handleSelect(l.code)}
              >
                <span>{l.label}</span>
                {isSelected && <span className="lang-selector__check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
