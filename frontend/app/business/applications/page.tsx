'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import {
  getAllApplications,
  getBusinessRequirements,
  updateApplicationStatus,
  type ApplicationReceived,
  type RequirementItem,
} from '@/lib/api/businessPortal';
import ApplicationCompareModal from '@/components/business/ApplicationCompareModal';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  IconAlertTriangle,
  IconUsers,
  IconCalendar,
  IconRupee,
  IconChevronDown,
  IconCheck,
  IconTarget,
} from '@/components/ui/Icons';
import './applications.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses', dotColor: '#64748b' },
  { value: 'SUBMITTED', label: 'Submitted', dotColor: '#3b82f6' },
  { value: 'UNDER_REVIEW', label: 'Under Review', dotColor: '#f59e0b' },
  { value: 'SHORTLISTED', label: 'Shortlisted', dotColor: '#8b5cf6' },
  { value: 'SELECTED', label: 'Selected', dotColor: '#10b981' },
  { value: 'REJECTED', label: 'Rejected', dotColor: '#ef4444' },
];

export default function MasterApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationReceived[]>([]);
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedReqId, setSelectedReqId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [error, setError] = useState('');

  // Dropdown States
  const [isReqOpen, setIsReqOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const reqDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getAllApplications({ requirement_id: selectedReqId || undefined, status: selectedStatus || undefined }),
      getBusinessRequirements(),
    ])
      .then(([{ data: appData }, { data: reqData }]) => {
        setApplications(appData);
        setRequirements(reqData);
      })
      .catch((err) => setError(err.message || 'Failed to fetch applications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedReqId, selectedStatus]);

  // Click outside and Escape key handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reqDropdownRef.current && !reqDropdownRef.current.contains(e.target as Node)) {
        setIsReqOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReqOpen(false);
        setIsStatusOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      setError(err.message || 'Failed to update status');
    } finally {
      setSelectingId(null);
    }
  };

  const comparedApps = applications.filter((app) => selectedForCompare.includes(app.id));

  // Current selections
  const currentReq = requirements.find((r) => r.id === selectedReqId);
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === selectedStatus) || STATUS_OPTIONS[0];

  return (
    <div className="apps-page">
      <WorkspacePageHeader
        title="Applications Received"
        subtitle="Review contractor proposals across all your manpower requirements."
      />

      {feedbackMsg && (
        <div className="apps-alert apps-alert--success">
          ✓ {feedbackMsg}
        </div>
      )}

      {error && (
        <div className="apps-alert apps-alert--error">
          <IconAlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="apps-filter-bar">
        <div className="apps-filter-group">
          {/* Custom Smooth Requirements Dropdown */}
          <div className="apps-custom-select-wrap" ref={reqDropdownRef}>
            <button
              type="button"
              className={`apps-custom-select-trigger ${isReqOpen ? 'open' : ''}`}
              onClick={() => {
                setIsReqOpen(!isReqOpen);
                setIsStatusOpen(false);
              }}
              aria-label="Filter by requirement"
              aria-expanded={isReqOpen}
            >
              <span className="apps-custom-select-text">
                {currentReq ? currentReq.title : 'All Requirements'}
              </span>
              <IconChevronDown size={13} className={`apps-custom-chevron ${isReqOpen ? 'open' : ''}`} />
            </button>

            {isReqOpen && (
              <div className="apps-custom-select-menu" role="listbox">
                <button
                  type="button"
                  className={`apps-custom-option ${!selectedReqId ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedReqId('');
                    setIsReqOpen(false);
                  }}
                  role="option"
                  aria-selected={!selectedReqId}
                >
                  <span className="apps-custom-option-label">All Requirements</span>
                  {!selectedReqId && <IconCheck size={13} className="apps-custom-check" />}
                </button>

                {requirements.map((r) => {
                  const isSelected = selectedReqId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`apps-custom-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedReqId(r.id);
                        setIsReqOpen(false);
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="apps-custom-option-label">{r.title}</span>
                      {isSelected && <IconCheck size={13} className="apps-custom-check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Smooth Statuses Dropdown */}
          <div className="apps-custom-select-wrap" ref={statusDropdownRef}>
            <button
              type="button"
              className={`apps-custom-select-trigger ${isStatusOpen ? 'open' : ''}`}
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsReqOpen(false);
              }}
              aria-label="Filter by status"
              aria-expanded={isStatusOpen}
            >
              <div className="apps-trigger-status-val">
                {currentStatus.value && (
                  <span
                    className="apps-trigger-status-dot"
                    style={{ background: currentStatus.dotColor }}
                  />
                )}
                <span className="apps-custom-select-text">{currentStatus.label}</span>
              </div>
              <IconChevronDown size={13} className={`apps-custom-chevron ${isStatusOpen ? 'open' : ''}`} />
            </button>

            {isStatusOpen && (
              <div className="apps-custom-select-menu" role="listbox">
                {STATUS_OPTIONS.map((s) => {
                  const isSelected = selectedStatus === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      className={`apps-custom-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedStatus(s.value);
                        setIsStatusOpen(false);
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="apps-option-status-wrap">
                        {s.value && (
                          <span
                            className="apps-option-status-dot"
                            style={{ background: s.dotColor }}
                          />
                        )}
                        <span className="apps-custom-option-label">{s.label}</span>
                      </div>
                      {isSelected && <IconCheck size={13} className="apps-custom-check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Compare Actions */}
        <div className="apps-compare-actions">
          <span className="apps-compare-count">
            {selectedForCompare.length} selected for compare
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
        <LoadingState label="Loading applications…" />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications found"
          subtitle="Contractor applications will appear here when submitted to published requirements."
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
                      <span style={{ fontSize: '13px', color: 'var(--craly-teal)', fontWeight: 600 }}>
                        For Requirement: {app.requirement_title}
                      </span>
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
                    <strong style={{ fontSize: '16px', color: 'var(--craly-navy)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconUsers size={15} /> {app.proposed_workforce} Workers
                    </strong>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                      Availability Date
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--craly-navy)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconCalendar size={14} /> {new Date(app.availability_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--craly-muted)', textTransform: 'uppercase' }}>
                      Proposed Rate
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--craly-navy)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IconRupee size={14} /> {app.proposed_rate ? `₹${app.proposed_rate}` : 'Negotiable'}
                    </span>
                  </div>
                </div>

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
    </div>
  );
}
