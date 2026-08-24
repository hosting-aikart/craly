'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getRequirementApplications,
  getBusinessRequirementById,
  updateApplicationStatus,
  type ApplicationReceived,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import ApplicationCompareModal from '@/components/business/ApplicationCompareModal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function RequirementApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [requirement, setRequirement] = useState<RequirementItem | null>(null);
  const [applications, setApplications] = useState<ApplicationReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getBusinessRequirementById(id),
      getRequirementApplications(id),
    ])
      .then(([{ data: reqData }, { data: appData }]) => {
        setRequirement(reqData);
        setApplications(appData);
      })
      .catch((err) => setError(err.message || 'Failed to load applications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleToggleSelectForCompare = (appId: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(appId) ? prev.filter((i) => i !== appId) : [...prev, appId]
    );
  };

  const handleStatusChange = async (appId: string, newStatus: 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED') => {
    setSelectingId(appId);
    setError('');
    try {
      const res = await updateApplicationStatus(appId, newStatus);
      setFeedbackMsg(res.message);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
    } finally {
      setSelectingId(null);
    }
  };

  const comparedApps = applications.filter((app) => selectedForCompare.includes(app.id));

  return (
    <>
      <WorkspacePageHeader
        title={requirement ? `Applications: ${requirement.title}` : 'Requirement Applications'}
        subtitle="Review, compare, and select contractor workforce proposals."
      />

      {feedbackMsg && (
        <div style={{ padding: '14px 18px', background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', marginBottom: '20px', fontWeight: 600 }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', marginBottom: '20px', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href={`/business/requirements/${id}`}
          style={{ fontSize: '14px', color: 'var(--craly-navy)', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Back to Requirement
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--craly-muted)', fontWeight: 600 }}>
            {selectedForCompare.length} selected for comparison
          </span>
          <Button
            variant="outline"
            onClick={() => setIsCompareOpen(true)}
            disabled={selectedForCompare.length === 0}
          >
            Compare Selected ({selectedForCompare.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading contractor applications…" />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications received yet"
          subtitle="Contractors will apply to this published requirement soon."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {applications.map((app) => {
            const isChecked = selectedForCompare.includes(app.id);
            const isSelected = app.application_status === 'SELECTED';

            return (
              <div
                key={app.id}
                style={{
                  background: isSelected ? '#f0fdf4' : 'var(--craly-white)',
                  border: `1px solid ${isSelected ? '#bbf7d0' : 'var(--craly-border)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectForCompare(app.id)}
                      style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--craly-navy)' }}>
                        {app.contractor_name}
                      </h3>
                      <div style={{ fontSize: '13px', color: 'var(--craly-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>📍 {app.contractor_city || 'City N/A'}</span>
                        {app.contractor_industry && <span>🏭 {app.contractor_industry}</span>}
                        {app.contractor_experience_years != null && <span>⭐ {app.contractor_experience_years} Yrs Exp</span>}
                        {app.contractor_workforce_size != null && <span>👥 {app.contractor_workforce_size} Total Workforce</span>}
                        {app.contractor_availability && <span>🟢 {app.contractor_availability.replace(/_/g, ' ')}</span>}
                        <span>📅 Submitted {new Date(app.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`status-badge status-badge--${app.application_status.toLowerCase()}`}>
                    {app.application_status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'var(--craly-surface)', padding: '14px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                      Workforce Offered
                    </span>
                    <strong style={{ fontSize: '16px', color: 'var(--craly-teal)' }}>
                      👥 {app.proposed_workforce} Workers
                    </strong>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                      Availability Date
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--craly-navy)' }}>
                      📅 {new Date(app.availability_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                      Proposed Rate
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--craly-navy)' }}>
                      💰 {app.proposed_rate ? `₹${app.proposed_rate}` : 'Negotiable'}
                    </span>
                  </div>
                </div>

                {(app.relevant_experience || app.message) && (
                  <div style={{ fontSize: '13px', color: 'var(--craly-text)', lineHeight: '1.5', background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--craly-border)' }}>
                    <strong>Contractor Remarks: </strong>
                    {app.relevant_experience || app.message}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--craly-border)', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {app.application_status !== 'UNDER_REVIEW' && !isSelected && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(app.id, 'UNDER_REVIEW')}
                        disabled={Boolean(selectingId)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--craly-border)', background: 'var(--craly-white)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Under Review
                      </button>
                    )}

                    {app.application_status !== 'SHORTLISTED' && !isSelected && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(app.id, 'SHORTLISTED')}
                        disabled={Boolean(selectingId)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--craly-border)', background: '#f3e8ff', color: '#7e22ce', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Shortlist
                      </button>
                    )}

                    {app.application_status !== 'REJECTED' && !isSelected && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(app.id, 'REJECTED')}
                        disabled={Boolean(selectingId)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  {isSelected ? (
                    <div style={{ padding: '6px 14px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '13px' }}>
                      ✓ Contractor Selected
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange(app.id, 'SELECTED')}
                      disabled={Boolean(selectingId)}
                    >
                      {selectingId === app.id ? 'Selecting…' : 'Select Contractor'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare Modal */}
      <ApplicationCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        applications={comparedApps}
        onSelectContractor={(app) => {
          setIsCompareOpen(false);
          handleStatusChange(app.id, 'SELECTED');
        }}
        selectingId={selectingId}
      />
    </>
  );
}
