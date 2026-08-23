'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getBusinessRequirements,
  publishBusinessRequirement,
  deleteBusinessRequirement,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_TABS = [
  { label: 'All Requirements', value: '' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Selected', value: 'SELECTED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function BusinessRequirementsListPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchRequirements = (statusFilter: string) => {
    setLoading(true);
    getBusinessRequirements(statusFilter)
      .then(({ data }) => setRequirements(data))
      .catch((err) => setError(err.message || 'Failed to fetch requirements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequirements(activeStatus);
  }, [activeStatus]);

  const handlePublishDraft = async (id: string) => {
    setActionId(id);
    try {
      await publishBusinessRequirement(id);
      fetchRequirements(activeStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to publish requirement');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this draft requirement?')) return;
    setActionId(id);
    try {
      await deleteBusinessRequirement(id);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft');
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <WorkspacePageHeader
        title="Manpower Requirements"
        subtitle="Post manpower needs, view active listings, and track contractor applications."
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeStatus === tab.value ? 'var(--craly-teal)' : 'var(--craly-border)',
                background: activeStatus === tab.value ? 'var(--craly-teal)' : 'var(--craly-white)',
                color: activeStatus === tab.value ? '#ffffff' : 'var(--craly-navy)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button variant="primary" onClick={() => router.push('/business/requirements/new')}>
          + Create Requirement
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading manpower requirements…" />
      ) : error ? (
        <div style={{ color: '#ef4444', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
          {error}
        </div>
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No requirements found"
          subtitle={activeStatus ? `No requirements with status '${activeStatus}'` : 'Create your first requirement to start receiving contractor proposals.'}
          action={
            <Button variant="primary" onClick={() => router.push('/business/requirements/new')}>
              + Create Requirement
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {requirements.map((req) => (
            <div
              key={req.id}
              style={{
                background: 'var(--craly-white)',
                border: '1px solid var(--craly-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--craly-navy)' }}>
                    <Link href={`/business/requirements/${req.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {req.title}
                    </Link>
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--craly-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>📍 {req.location}</span>
                    <span>🏢 {req.industry || 'General Industry'}</span>
                    <span>👥 {req.workers_required} Workers</span>
                    <span>📅 Starts {new Date(req.start_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      background: req.status === 'PUBLISHED' ? '#dcfce7' : req.status === 'SELECTED' ? '#e0e7ff' : '#f1f5f9',
                      color: req.status === 'PUBLISHED' ? '#15803d' : req.status === 'SELECTED' ? '#4338ca' : '#64748b',
                    }}
                  >
                    {req.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {req.description && (
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--craly-text)', lineHeight: '1.5' }}>
                  {req.description.length > 180 ? `${req.description.slice(0, 180)}…` : req.description}
                </p>
              )}

              {req.required_skills && req.required_skills.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {req.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'var(--craly-surface)',
                        border: '1px solid var(--craly-border)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: 'var(--craly-navy)',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--craly-border)', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--craly-teal)' }}>
                  📥 {req.applications_count} {req.applications_count === 1 ? 'Application' : 'Applications'} Received
                </span>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {req.status === 'DRAFT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(req.id)}
                        disabled={actionId === req.id}
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ffffff',
                          background: 'var(--craly-teal)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {actionId === req.id ? 'Publishing…' : 'Publish Now'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(req.id)}
                        disabled={actionId === req.id}
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#dc2626',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Delete Draft
                      </button>
                    </>
                  )}

                  <Link
                    href={`/business/requirements/${req.id}`}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--craly-navy)',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      border: '1px solid var(--craly-border)',
                      borderRadius: '6px',
                    }}
                  >
                    View Details
                  </Link>

                  <Link
                    href={`/business/requirements/${req.id}/applications`}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: req.status === 'DRAFT' ? 'var(--craly-navy)' : 'var(--craly-teal)',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    Applications ({req.applications_count}) →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
