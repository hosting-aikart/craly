'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { listContractors, type ContractorListing } from '@/lib/api/contractors';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import SearchBar from '@/components/SearchBar';
import ContractorCard from '@/components/ContractorCard';
import StatusPill from '@/components/enquiries/StatusPill';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import '@/components/AuthForm.css';
import '../../dashboard.css';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [heroQuery, setHeroQuery] = useState('');

  const [recent, setRecent] = useState<ContractorListing[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);

  useEffect(() => {
    listContractors({ limit: 3 })
      .then(({ data }) => setRecent(data))
      .catch(() => setRecent([]))
      .finally(() => setRecentLoading(false));

    listEnquiries()
      .then(({ data }) => setEnquiries(data))
      .catch(() => setEnquiries([]))
      .finally(() => setEnquiriesLoading(false));
  }, []);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(heroQuery ? `/business/contractors?q=${encodeURIComponent(heroQuery)}` : '/business/contractors');
  };

  const pendingCount = enquiries.filter((e) => ['NEW', 'UNDER_REVIEW'].includes(String(e.status).toUpperCase())).length;
  const acceptedCount = enquiries.filter((e) => ['BROKERING', 'CONTACTED', 'IN_PROGRESS'].includes(String(e.status).toUpperCase())).length;
  const unreadCount = enquiries.filter((e) => e.has_unread).length;

  return (
    <>
      <WorkspacePageHeader
        title={t.nav.dashboard}
        subtitle={t.businessDashboard.subtitle}
      />

      <div className="dashboard-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>{t.businessDashboard.statEnquiries.toUpperCase()}</span>
          <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{enquiries.length}</strong>
          <span style={{ fontSize: '12px', color: 'var(--craly-teal)' }}>{acceptedCount} {t.enquiries.statusAccepted.toLowerCase()} • {pendingCount} {t.enquiries.statusPending.toLowerCase()}</span>
        </div>

        <div className="dashboard__card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--craly-muted)', letterSpacing: '0.5px' }}>{t.nav.inbox.toUpperCase()}</span>
          <strong style={{ fontSize: '28px', color: 'var(--craly-navy)', fontFamily: 'var(--font-heading)' }}>{unreadCount}</strong>
          <Link href="/business/inbox" style={{ fontSize: '12px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600 }}>{t.nav.inbox} →</Link>
        </div>
      </div>

      {/* Quick Search */}
      <div className="dashboard__search-hero" style={{ marginBottom: '32px' }}>
        <h2>{t.businessDashboard.searchHeroTitle}</h2>
        <form className="dashboard__search-form" onSubmit={handleSearchSubmit}>
          <SearchBar value={heroQuery} onChange={setHeroQuery} placeholder={t.contractors.searchPlaceholder} />
          <Button type="submit" variant="primary">{t.businessDashboard.searchHeroSub || t.nav.findContractors}</Button>
        </form>
      </div>

      {/* Recent Enquiries summary */}
      <div className="dashboard__card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t.businessDashboard.recentEnquiriesTitle}</h3>
          <Link href="/business/enquiries" style={{ fontSize: '13px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600 }}>{t.businessDashboard.viewAllEnquiries} →</Link>
        </div>

        {enquiriesLoading ? (
          <LoadingState label={t.common.loading} />
        ) : enquiries.length === 0 ? (
          <EmptyState title={t.businessDashboard.noEnquiries} subtitle="" />
        ) : (
          <ul className="dashboard__list">
            {enquiries.slice(0, 4).map((enq) => (
              <li key={enq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--craly-border)' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--craly-navy)' }}>{enq.other_party_name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--craly-muted)' }}>{enq.category_name || 'Labour Supply'} {enq.workers_required ? `• ${enq.workers_required} workers` : ''}</span>
                </div>
                <StatusPill status={enq.status} viewer="business" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recommended Contractors Section */}
      <div style={{ marginTop: '36px' }}>
        <div className="dashboard__section-head">
          <h2>{t.contractors.verifiedBadge}</h2>
          <Link href="/business/contractors">{t.nav.findContractors} →</Link>
        </div>
        {recentLoading ? (
          <LoadingState cards={3} label={t.common.loading} />
        ) : (
          <div className="dashboard__recommend-grid">
            {recent.map((c) => (
              <ContractorCard key={c.id} contractor={c} basePath="/business/contractors" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
