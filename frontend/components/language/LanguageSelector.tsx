'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { POPULAR_LANGUAGES, getLanguageByCode } from '@/lib/i18n/languages';
import { getSavedLanguageCode, changeGoogleTranslateLanguage } from './GoogleTranslateScript';
import LanguageSelectorModal from './LanguageSelectorModal';
import { IconGlobe, IconCheck, IconChevronDown } from '@/components/ui/Icons';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  variant?: 'header' | 'mobile' | 'minimal';
}

export default function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('en');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentCode(getSavedLanguageCode());
  }, [language]);

  const currentLang = getLanguageByCode(currentCode);

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

  const handleSelect = (code: string) => {
    if (code === 'en' || code === 'hi' || code === 'mr') {
      setLanguage(code as any);
    }
    setCurrentCode(code);
    changeGoogleTranslateLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className="mobile-lang-selector">
        <div className="mobile-lang-selector__options">
          {POPULAR_LANGUAGES.slice(0, 5).map((l) => (
            <button
              key={l.code}
              type="button"
              className={`mobile-lang-selector__option ${currentCode === l.code ? 'mobile-lang-selector__option--active' : ''}`}
              onClick={() => handleSelect(l.code)}
            >
              {l.nativeName} {currentCode === l.code ? <IconCheck size={13} /> : null}
            </button>
          ))}
          <button
            type="button"
            className="mobile-lang-selector__option mobile-lang-selector__option--more"
            onClick={() => setIsModalOpen(true)}
          >
            🌐 More (130+)...
          </button>
        </div>

        <LanguageSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentLanguage={currentCode}
          onSelectLanguage={handleSelect}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`lang-selector lang-selector--${variant}`} ref={containerRef}>
        <button
          type="button"
          className={`lang-selector__trigger ${isOpen ? 'lang-selector__trigger--open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select language"
        >
          <IconGlobe size={15} className="lang-selector__globe" />
          <span className="lang-selector__current">{currentLang.nativeName || currentLang.name}</span>
          <IconChevronDown size={12} className="lang-selector__arrow" />
        </button>

        {isOpen && (
          <div className="lang-selector__dropdown" role="listbox" tabIndex={-1}>
            <div className="lang-selector__dropdown-header">Select Language</div>
            <div className="lang-selector__items-list">
              {POPULAR_LANGUAGES.map((l) => {
                const isSelected = currentCode === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`lang-selector__item ${isSelected ? 'lang-selector__item--selected' : ''}`}
                    onClick={() => handleSelect(l.code)}
                  >
                    <div className="lang-selector__item-info">
                      <span className="lang-selector__item-native">{l.nativeName}</span>
                      <span className="lang-selector__item-name">{l.name}</span>
                    </div>
                    {isSelected && <IconCheck size={14} className="lang-selector__check" />}
                  </button>
                );
              })}
            </div>

            <div className="lang-selector__dropdown-footer">
              <button
                type="button"
                className="lang-selector__more-btn"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
              >
                <span>🌐 All 130+ Languages...</span>
                <span className="lang-selector__more-arrow">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <LanguageSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLanguage={currentCode}
        onSelectLanguage={handleSelect}
      />
    </>
  );
}
