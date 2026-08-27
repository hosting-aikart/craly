'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet, apiPatch } from '@/lib/api';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

interface ContractorReviewDetail {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  email: string;
  description: string | null;
}

export default function AdminVerificationReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const [contractor, setContractor] = useState<ContractorReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const [checklist, setChecklist] = useState({
    identityVerified: false,
    businessDetailsVerified: false,
    documentsReviewed: false,
    experienceReviewed: false,
    workforceReviewed: false,
    contactVerified: false,
  });

  useEffect(() => {
    if (!id) return;
    apiGet<{ data: any }>('/admin/verification')
      .then(({ data }) => {
        const item = data.find((c: any) => c.id === id);
        if (item) {
          setContractor(item);
          setNote(item.verification_note || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Matches contractor_profiles.verification_status's DB check constraint
  // ('pending' | 'verified' | 'rejected') — there is no 'needs_changes'
  // status. "Request Changes" sends the contractor back to 'pending' with
  // the note recorded as feedback, rather than a status the DB would reject.
  const handleReviewAction = async (status: 'verified' | 'pending' | 'rejected') => {
    setSaving(true);
    try {
      await apiPatch(`/admin/verification/${id}`, {
        status,
        note,
        checklist,
      });
      router.push('/admin/verification');
    } catch (err) {
      console.error('Failed to submit verification action', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <WorkspacePageHeader
        title="Contractor Verification Review"
        subtitle={contractor ? `Verification checklist for ${contractor.company_name}` : 'Verification Checklist'}
      />
      <Link href="/admin/verification" style={{ fontSize: '13px', color: 'var(--craly-teal)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Verification Queue
      </Link>

      {loading ? (
        <LoadingState label="Loading contractor verification details…" />
      ) : !contractor ? (
        <EmptyState title="Contractor not found" subtitle="The requested contractor record was not found." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Left: Submitted Contractor Details */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--craly-navy)', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>Contractor Submitted Details</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Company Name</span>
                <strong style={{ color: 'var(--craly-navy)', fontSize: '16px' }}>{contractor.company_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Contact Email</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{contractor.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Operating Location</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{[contractor.city, contractor.state].filter(Boolean).join(', ') || 'Not specified'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Workforce Capacity</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{contractor.workforce_size ? `${contractor.workforce_size} workers` : 'Unspecified'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--craly-muted)', display: 'block', fontSize: '12px' }}>Years of Experience</span>
                <strong style={{ color: 'var(--craly-navy)' }}>{contractor.years_experience ? `${contractor.years_experience} years` : 'Unspecified'}</strong>
              </div>
            </div>
          </div>

          {/* Right: Verification Checklist & Action Controls */}
          <div style={{ background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--craly-navy)', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>Verification Checklist</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'identityVerified', label: 'Identity verified' },
                { key: 'businessDetailsVerified', label: 'Business details verified' },
                { key: 'documentsReviewed', label: 'Documents reviewed' },
                { key: 'experienceReviewed', label: 'Experience information reviewed' },
                { key: 'workforceReviewed', label: 'Workforce information reviewed' },
                { key: 'contactVerified', label: 'Contact information verified' },
              ].map((item) => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--craly-navy)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist[item.key as keyof typeof checklist]}
                    onChange={() => toggleCheck(item.key as keyof typeof checklist)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--craly-teal)' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--craly-navy)', marginBottom: '6px' }}>Verification Notes / Feedback</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter notes or explanation for the contractor..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '13.5px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
              <Button variant="primary" size="md" onClick={() => handleReviewAction('verified')} disabled={saving}>
                ✓ Approve Verification
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleReviewAction('pending')} disabled={saving}>
                Request Changes
              </Button>
              <Button variant="ghost" size="md" onClick={() => handleReviewAction('rejected')} disabled={saving} style={{ color: '#e11d48' }}>
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
