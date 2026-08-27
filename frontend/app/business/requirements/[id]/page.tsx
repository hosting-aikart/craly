'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getBusinessRequirementById,
  publishBusinessRequirement,
  deleteBusinessRequirement,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';

export default function RequirementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [requirement, setRequirement] = useState<RequirementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRequirement = () => {
    setLoading(true);
    getBusinessRequirementById(id)
      .then(({ data }) => setRequirement(data))
      .catch((err) => setError(err.message || 'Failed to load requirement details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequirement();
  }, [id]);

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      const res = await publishBusinessRequirement(id);
      setSuccessMsg(res.message || 'Requirement published successfully!');
      fetchRequirement();
    } catch (err: any) {
      setError(err.message || 'Failed to publish requirement');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this draft requirement?')) return;
    setDeleting(true);
    setError('');
    try {
      await deleteBusinessRequirement(id);
      router.push('/business/requirements');
    } catch (err: any) {
      setError(err.message || 'Failed to delete requirement');
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading requirement details…" />;
  }

  if (error || !requirement) {
    return (
      <div style={{ padding: '24px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px' }}>
        {error || 'Requirement not found'}
      </div>
    );
  }

  const isDraft = requirement.status === 'DRAFT';

  return (
    <>
      <WorkspacePageHeader
        title={requirement.title}
        subtitle={`Requirement ID: ${requirement.id}`}
      />

      {successMsg && (
        <div style={{ padding: '14px 18px', background: '#dcfce7', color: '#15803d', borderRadius: '10px', marginBottom: '20px', fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '900px' }}>
        {/* Detail Card */}
        <div
          style={{
            background: 'var(--craly-white)',
            border: '1px solid var(--craly-border)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  background: isDraft ? '#f1f5f9' : requirement.status === 'PUBLISHED' ? '#dcfce7' : '#e0e7ff',
                  color: isDraft ? '#64748b' : requirement.status === 'PUBLISHED' ? '#15803d' : '#4338ca',
                }}
              >
                {requirement.status.replace('_', ' ')}
              </span>
              <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--craly-navy)' }}>{requirement.title}</h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isDraft && (
                <>
                  <Button
                    variant="primary"
                    onClick={handlePublish}
                    disabled={publishing || deleting}
                  >
                    {publishing ? 'Publishing…' : 'Publish Requirement'}
                  </Button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={publishing || deleting}
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#dc2626',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete Draft'}
                  </button>
                </>
              )}

              <Link
                href={`/business/requirements/${requirement.id}/applications`}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'var(--craly-teal)',
                  textDecoration: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                View Applications ({requirement.applications_count}) →
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--craly-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--craly-border)' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                Workers Required
              </span>
              <strong style={{ fontSize: '18px', color: 'var(--craly-navy)' }}>👥 {requirement.workers_required}</strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                Location
              </span>
              <span style={{ fontSize: '15px', color: 'var(--craly-navy)' }}>📍 {requirement.location}</span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                Start Date & Duration
              </span>
              <span style={{ fontSize: '15px', color: 'var(--craly-navy)' }}>
                📅 {new Date(requirement.start_date).toLocaleDateString()} ({requirement.duration})
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                Budget Range
              </span>
              <span style={{ fontSize: '15px', color: 'var(--craly-navy)' }}>
                💰 {requirement.budget_min || requirement.budget_max ? `₹${requirement.budget_min || 0} - ₹${requirement.budget_max || 'N/A'}` : 'Negotiable'}
              </span>
            </div>
          </div>

          {requirement.description && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--craly-navy)' }}>Description</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--craly-text)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {requirement.description}
              </p>
            </div>
          )}

          {requirement.required_skills && requirement.required_skills.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--craly-navy)' }}>Required Skills</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {requirement.required_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--craly-surface)',
                      border: '1px solid var(--craly-border)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: 'var(--craly-navy)',
                      fontWeight: 600,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--craly-border)', fontSize: '12px', color: 'var(--craly-muted)' }}>
            <span>Created: {new Date(requirement.created_at).toLocaleString()}</span>
            {requirement.published_at && (
              <span>Published: {new Date(requirement.published_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
