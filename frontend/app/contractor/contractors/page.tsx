'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { listInternalContractors, createInternalContractor, type InternalContractor } from '@/lib/api/internalContractors';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import '../field-staff.css';
import './contractors.css';

const AVAILABILITY_TONE: Record<string, string> = {
  AVAILABLE: 'positive',
  CURRENTLY_AT_CAPACITY: 'pending',
  NOT_AVAILABLE: '',
  PAUSED: '',
  SUSPENDED: '',
};

/**
 * Contractors list (spec §1/§14 "Create contractor: YES"). Mobile card
 * list backed by the existing GET /internal/contractors — no new backend
 * endpoint, no desktop table. "+ New Contractor" is for a walk-in/directly
 * met contractor with no prior onboarding request; everything else in the
 * list originated through Start Profile on a request.
 */
export default function ContractorsListPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [contractors, setContractors] = useState<InternalContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listInternalContractors()
      .then(({ data }) => setContractors(data))
      .catch(() => setContractors([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await createInternalContractor({ companyName: newName.trim() });
      router.push(`/contractor/contractors/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create contractor');
      setSubmitting(false);
    }
  };

  return (
    <>
      <WorkspacePageHeader title={t.fieldStaff.nav.contractors} />

      <div className="pf-list-head">
        {!creating && (
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            {t.fieldStaff.common.newContractor}
          </Button>
        )}
      </div>

      {creating && (
        <form className="pf-new-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder={t.fieldStaff.profileForm.companyName}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          {error && <p className="auth-error">{error}</p>}
          <div className="pf-new-form__actions">
            <Button type="submit" variant="primary" size="sm" disabled={submitting || !newName.trim()}>
              {submitting ? '…' : t.fieldStaff.common.newContractor}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setCreating(false); setNewName(''); setError(''); }}>
              {t.fieldStaff.profileForm.back}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState label="Loading contractors…" />
      ) : contractors.length === 0 ? (
        <EmptyState title={t.fieldStaff.common.noContractors} />
      ) : (
        <div className="pf-card-list">
          {contractors.map((c) => (
            <a key={c.id} className="pf-card" href={`/contractor/contractors/${c.id}`}>
              <div className="pf-card__top">
                <h3>{c.company_name}</h3>
              </div>
              <p className="pf-card__meta">
                {[c.city, c.phone].filter(Boolean).join(' · ') || '—'}
              </p>
              <div className="pf-card__badges">
                <span className={`fs-status-badge ${AVAILABILITY_TONE[c.availability] === 'positive' ? 'fs-status-badge--positive' : AVAILABILITY_TONE[c.availability] === 'pending' ? 'fs-status-badge--pending' : ''}`}>
                  {c.availability.replace(/_/g, ' ')}
                </span>
                <span className={`fs-status-badge ${c.verification_status === 'verified' ? 'fs-status-badge--positive' : c.verification_status === 'pending' ? 'fs-status-badge--pending' : ''}`}>
                  {c.verification_status}
                </span>
                {!c.onboarding_complete && <span className="fs-status-badge">{t.fieldStaff.profileForm.notPublished}</span>}
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
