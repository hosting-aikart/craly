'use client';

import React from 'react';
import StateSelect, { type StateSelectProps } from './StateSelect';

export interface IndianStateSelectProps extends StateSelectProps {}

/**
 * Indian State Select component.
 * Standardized dropdown for 28 Indian States & 8 Union Territories.
 * Powered by country-aware StateSelect with countryCode='IN'.
 */
export default function IndianStateSelect({
  countryCode = 'IN',
  ...props
}: IndianStateSelectProps) {
  return <StateSelect countryCode={countryCode} {...props} />;
}
