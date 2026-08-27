'use client';

import React, { useEffect, useState, FormEvent, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOpportunityById, applyToOpportunity, type Opportunity } from '@/lib/api/contractorPortal';
import LoadingState from '@/components/ui/LoadingState';
import './opportunity-detail.css';

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Application form fields
  const [proposedWorkforce, setProposedWorkforce] = useState<number | ''>('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [message, setMessage] = useState('');
  const [proposedRate, setProposedRate] = useState<number | ''>('');

  useEffect(() => {
    getOpportunityById(resolvedParams.id)
      .then(({ data }) => {
        setOpportunity(data);
        if (data.workers_required) {
          setProposedWorkforce(data.workers_required);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Opportunity not found'))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!proposedWorkforce || !availabilityDate) {
      setError('Please fill in proposed workforce and availability date.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await applyToOpportunity(resolvedParams.id, {
        proposedWorkforce: Number(proposedWorkforce),
        availabilityDate,
        relevantExperience: relevantExperience || undefined,
        message: message || undefined,
        proposedRate: proposedRate === '' ? undefined : Number(proposedRate),
      });

      setSuccessMessage(res.data.message || 'Application submitted successfully.');
      setShowApplyModal(false);
      // Reload opportunity details to show application status
      const updated = await getOpportunityById(resolvedParams.id);
      setOpportunity(updated.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Opportunity details…" />;
  }

  if (error && !opportunity) {
    return (
      <div className="opportunity-detail-page">
        <Link href="/contractor-portal/opportunities" className="back-link">
          ← Back to Opportunities
        </Link>
        <div className="opportunity-error-card">{error}</div>
      </div>
    );
  }

  if (!opportunity) return null;

  return (
    <div className="opportunity-detail-page">
      <Link href="/contractor-portal/opportunities" className="back-link">
        ← Back to Opportunities
      </Link>

      {successMessage && (
        <div className="opportunity-success-banner">
          🎉 {successMessage}
        </div>
      )}

      {/* Main Detail Header */}
      <div className="opportunity-detail-header">
        <div>
          <div className="opportunity-detail-tags">
            {opportunity.industry && (
              <span className="opportunity-tag opportunity-tag--industry">{opportunity.industry}</span>
            )}
            <span className="opportunity-tag opportunity-tag--location">📍 {opportunity.location}</span>
          </div>
          <h1 className="opportunity-detail-title">{opportunity.title}</h1>
          <p className="opportunity-posted-info">
            Posted on {new Date(opportunity.published_at || opportunity.created_at).toLocaleDateString()}
          </p>
        </div>

        {opportunity.has_applied ? (
          <div className="already-applied-box">
            <span className="already-applied-status">✓ Already Applied</span>
            <span className="already-applied-sub">
              Status: <strong>{opportunity.my_application_status || 'SUBMITTED'}</strong>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="apply-now-btn"
            onClick={() => setShowApplyModal(true)}
          >
            Apply Now 🚀
          </button>
        )}
      </div>

      {/* Personalized Match Banner */}
      {opportunity.match_score && (
        <div
          style={{
            background: '#f0fdfa',
            border: '1px solid #ccfbf1',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <strong style={{ color: '#0f766e', fontSize: '15px' }}>
                {opportunity.match_score}% Personalized Match for Your Company
              </strong>
            </div>
            {opportunity.match_reasons && opportunity.match_reasons.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {opportunity.match_reasons.map((r, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '12px',
                      background: '#fff',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    ✓ {r}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>
            Matched based on your company location, capacity & experience
          </span>
        </div>
      )}

      {/* Overview Grid */}
      <div className="opportunity-detail-grid">
        <div className="opportunity-main-card">
          <h3 className="section-title">Requirement Overview</h3>
          <p className="opportunity-full-desc">{opportunity.description || 'No detailed description provided.'}</p>

          {opportunity.required_skills && opportunity.required_skills.length > 0 && (
            <div className="skills-section">
              <h4>Required Skills & Trades</h4>
              <div className="skills-pill-list">
                {opportunity.required_skills.map((skill) => (
                  <span key={skill} className="skill-pill">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="opportunity-side-card">
          <h3 className="section-title">Project Details</h3>
          <div className="side-detail-list">
            <div className="side-detail-item">
              <span>Workers Required</span>
              <strong>{opportunity.workers_required} Workers</strong>
            </div>
            <div className="side-detail-item">
              <span>Start Date</span>
              <strong>{new Date(opportunity.start_date).toLocaleDateString()}</strong>
            </div>
            <div className="side-detail-item">
              <span>Duration</span>
              <strong>{opportunity.duration}</strong>
            </div>
            {opportunity.experience_required && (
              <div className="side-detail-item">
                <span>Experience Required</span>
                <strong>{opportunity.experience_required} Years</strong>
              </div>
            )}
            {(opportunity.budget_min || opportunity.budget_max) && (
              <div className="side-detail-item">
                <span>Budget / Rate</span>
                <strong>
                  ₹{opportunity.budget_min || 0} - ₹{opportunity.budget_max || 0}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      {showApplyModal && (
        <div className="apply-modal-backdrop" onClick={() => setShowApplyModal(false)}>
          <div className="apply-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="apply-modal-header">
              <h2>Apply for Requirement</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowApplyModal(false)}
              >
                ✕
              </button>
            </div>

            {error && <div className="modal-error-box">{error}</div>}

            <form onSubmit={handleApply} className="apply-form">
              <div className="form-group">
                <label>Proposed Workforce Count *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={proposedWorkforce}
                  onChange={(e) => setProposedWorkforce(e.target.value ? Number(e.target.value) : '')}
                  placeholder={`Required: ${opportunity.workers_required}`}
                />
              </div>

              <div className="form-group">
                <label>Earliest Availability Date *</label>
                <input
                  type="date"
                  required
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Proposed Daily Rate / Worker (₹ Optional)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 850"
                />
              </div>

              <div className="form-group">
                <label>Relevant Past Experience</label>
                <textarea
                  rows={3}
                  value={relevantExperience}
                  onChange={(e) => setRelevantExperience(e.target.value)}
                  placeholder="Briefly describe your experience with similar project requirements..."
                />
              </div>

              <div className="form-group">
                <label>Notes / Cover Message</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any extra details, questions, or notes for Craly Operations..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowApplyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-submit-btn" disabled={submitting}>
                  {submitting ? 'Submitting Application…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
