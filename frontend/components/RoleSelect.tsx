'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import './RoleSelect.css';

export default function RoleSelect() {
  const { t } = useLanguage();

  return (
    <section className="role-select">
      <div className="role-select__inner">
      <p className="role-select__eyebrow">{t.roleSelect.eyebrow}</p>
      <h2 className="role-select__heading">{t.roleSelect.heading}</h2>

      <div className="role-select__grid">
        <div className="role-card role-card--contractor">
          <div className="role-card__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 18a7 7 0 0 1 14 0" />
              <path d="M9 18v-2" />
              <path d="M12 6v2" />
              <rect x="2" y="17" width="20" height="3" rx="1" />
            </svg>
          </div>
          <h3>{t.roleSelect.contractorTitle}</h3>
          <p>{t.roleSelect.contractorDesc}</p>
          <Link href="/list-your-company" className="role-card__action">
            {t.roleSelect.contractorAction}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div className="role-card role-card--business">
          <div className="role-card__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="1" />
              <path d="M9 8h1M14 8h1M9 12h1M14 12h1" />
              <path d="M10 21v-4h4v4" />
            </svg>
          </div>
          <h3>{t.roleSelect.businessTitle}</h3>
          <p>{t.roleSelect.businessDesc}</p>
          <Link href="/contractors" className="role-card__action">
            {t.roleSelect.businessAction}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
      </div>
    </section>
  );
}
