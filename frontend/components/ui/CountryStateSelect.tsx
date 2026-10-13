'use client';

import React from 'react';
import { DEFAULT_COUNTRY, type CountryOption } from '@/lib/util/countries';
import CountrySelect from './CountrySelect';
import StateSelect from './StateSelect';
import './CountryStateSelect.css';

export interface CountryStateSelectProps {
  country: CountryOption;
  state: string;
  onCountryChange: (country: CountryOption) => void;
  onStateChange: (state: string) => void;
  countryLabel?: string;
  stateLabel?: string;
  countryPlaceholder?: string;
  statePlaceholder?: string;
  disabled?: boolean;
  clearableState?: boolean;
  className?: string;
}

/**
 * Coordinated Country and State dropdown pair.
 * Automatically updates the State dropdown options whenever Country changes.
 */
export default function CountryStateSelect({
  country = DEFAULT_COUNTRY,
  state,
  onCountryChange,
  onStateChange,
  countryLabel = 'Country / Region',
  stateLabel = 'State / Province',
  countryPlaceholder,
  statePlaceholder,
  disabled = false,
  clearableState = true,
  className = '',
}: CountryStateSelectProps) {
  const handleCountryChange = (newCountry: CountryOption) => {
    onCountryChange(newCountry);
    // Clear state when switching country so stale/invalid state is not retained
    onStateChange('');
  };

  return (
    <div className={`craly-country-state-row ${className}`}>
      <div className="craly-country-state-col">
        {countryLabel && <span className="craly-select-label">{countryLabel}</span>}
        <CountrySelect
          value={country}
          onChange={handleCountryChange}
          placeholder={countryPlaceholder}
          disabled={disabled}
        />
      </div>

      <div className="craly-country-state-col">
        {stateLabel && <span className="craly-select-label">{stateLabel}</span>}
        <StateSelect
          countryCode={country.code}
          value={state}
          onChange={onStateChange}
          placeholder={statePlaceholder}
          disabled={disabled}
          clearable={clearableState}
        />
      </div>
    </div>
  );
}
