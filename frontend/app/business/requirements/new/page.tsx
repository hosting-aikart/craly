'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { createBusinessRequirement, updateBusinessRequirement, type CreateRequirementInput } from '@/lib/api/businessPortal';
import Button from '@/components/ui/Button';
import {
  IconBriefcase,
  IconTarget,
  IconMapPin,
  IconUsers,
  IconCalendar,
  IconRupee,
  IconTools,
  IconClock,
  IconShield,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
} from '@/components/ui/Icons';
import './requirement-form.css';

export default function CreateRequirementPage() {
  const router = useRouter();

  const [draftId, setDraftId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRequirementInput>({
    title: '',
    description: '',
    industry: '',
    location: '',
    city: '',
    state: '',
    workersRequired: 10,
    requiredSkills: '',
    startDate: '',
    duration: '3 Months',
    experienceRequired: 2,
    budgetMin: undefined,
    budgetMax: undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'workersRequired' || name === 'experienceRequired' || name === 'budgetMin' || name === 'budgetMax'
        ? value === '' ? undefined : Number(value)
        : value,
    }));
  };

  const handleSubmit = async (action: 'draft' | 'publish') => {
    setError('');
    if (!formData.title.trim()) {
      setError('Requirement title is required');
      return;
    }
    if (!formData.location.trim()) {
      setError('Location / Plant area is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required for contractor matching');
      return;
    }
    if (!formData.state.trim()) {
      setError('State jurisdiction is required');
      return;
    }
    if (!formData.startDate) {
      setError('Project start date is required');
      return;
    }
    if (!formData.workersRequired || formData.workersRequired < 1) {
      setError('Workers required must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      if (draftId) {
        const res = await updateBusinessRequirement(draftId, {
          ...formData,
          action,
        });
        router.push(`/business/requirements/${res.data.id}`);
      } else {
        const res = await createBusinessRequirement({
          ...formData,
          action,
        });
        if (action === 'draft') {
          setDraftId(res.data.id);
        }
        router.push(`/business/requirements/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save requirement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="req-create-page">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="req-hero-banner">
        <div className="req-hero-content">
          <span className="req-hero-badge">
            <IconBriefcase size={12} /> Enterprise Manpower Tender
          </span>
          <h1>Post Manpower Requirement</h1>
          <p>
            Specify industrial trade skills, workforce headcount, mobilization zones, and commercial parameters
            to receive verified contractor proposals instantly.
          </p>

          <div className="req-hero-highlights">
            <span className="req-highlight-tag">
              <IconShield size={12} /> Verified Contractors Only
            </span>
            <span className="req-highlight-tag">
              <IconTarget size={12} /> Algorithmic Matching
            </span>
            <span className="req-highlight-tag">
              <IconCheck size={12} /> Escrow Protected
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="req-alert req-alert--error">
          <IconAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Form Container ──────────────────────────────────────── */}
      <form onSubmit={(e) => e.preventDefault()} className="req-form-card">
        {/* Section 1: Role Overview */}
        <div className="req-section">
          <div className="req-section-head">
            <div className="req-section-icon">
              <IconTarget size={18} />
            </div>
            <div>
              <h3 className="req-section-title">1. Role & Trade Profile</h3>
              <p className="req-section-hint">Primary trade title, industry vertical, and job description</p>
            </div>
          </div>

          <div className="req-grid req-grid--full">
            <div className="req-field">
              <label>Requirement Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. 25 Automotive Assembly Line Technicians"
                required
              />
              <span className="req-field-hint">A clear, descriptive title to attract qualified contractors</span>
            </div>
          </div>

          <div className="req-grid req-grid--2col" style={{ marginTop: '16px' }}>
            <div className="req-field">
              <label>Industry / Domain</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. Automotive, Manufacturing, EPC"
              />
              <span className="req-field-hint">Primary industrial sector for category filtering</span>
            </div>

            <div className="req-field">
              <label>Required Trade Skills</label>
              <input
                type="text"
                name="requiredSkills"
                value={typeof formData.requiredSkills === 'string' ? formData.requiredSkills : formData.requiredSkills?.join(', ')}
                onChange={handleChange}
                placeholder="e.g. MIG Welding, CNC Operation, Assembly"
              />
              <span className="req-field-hint">Comma separated specific trades or certifications</span>
            </div>
          </div>

          <div className="req-field" style={{ marginTop: '16px' }}>
            <label>Detailed Scope & Facility Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide plant shift timings, specific safety gear requirements, accommodation details, and work environment notes..."
            />
            <span className="req-field-hint">Clear scope details help contractors propose accurate commercial terms</span>
          </div>
        </div>

        {/* Section 2: Mobilization Location */}
        <div className="req-section">
          <div className="req-section-head">
            <div className="req-section-icon req-section-icon--blue">
              <IconMapPin size={18} />
            </div>
            <div>
              <h3 className="req-section-title">2. Mobilization & Plant Location</h3>
              <p className="req-section-hint">Geographical area used to match nearby contractor pools</p>
            </div>
          </div>

          <div className="req-grid req-grid--full">
            <div className="req-field">
              <label>Plant / Locality Address *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Chakan Industrial Area, Phase II, Pune"
                required
              />
              <span className="req-field-hint">Exact facility address or MIDC / industrial corridor</span>
            </div>
          </div>

          <div className="req-grid req-grid--2col" style={{ marginTop: '16px' }}>
            <div className="req-field">
              <label>City / Hub *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Pune"
                required
              />
              <span className="req-field-hint">Used for matching contractors within reachable dispatch range</span>
            </div>

            <div className="req-field">
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                required
              />
              <span className="req-field-hint">State jurisdiction for statutory wage & ESIC compliance</span>
            </div>
          </div>
        </div>

        {/* Section 3: Workforce Capacity & Schedule */}
        <div className="req-section">
          <div className="req-section-head">
            <div className="req-section-icon req-section-icon--amber">
              <IconUsers size={18} />
            </div>
            <div>
              <h3 className="req-section-title">3. Workforce Capacity & Timelines</h3>
              <p className="req-section-hint">Quantity, deployment schedule, and duration</p>
            </div>
          </div>

          <div className="req-grid req-grid--2col">
            <div className="req-field">
              <label>Workers Required *</label>
              <input
                type="number"
                name="workersRequired"
                value={formData.workersRequired || ''}
                onChange={handleChange}
                min="1"
                placeholder="e.g. 25"
                required
              />
              <span className="req-field-hint">Total headcount needed for this requirement</span>
            </div>

            <div className="req-field">
              <label>Experience Required (Years)</label>
              <input
                type="number"
                name="experienceRequired"
                value={formData.experienceRequired ?? ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 2"
              />
              <span className="req-field-hint">Minimum years of relevant industrial trade experience</span>
            </div>
          </div>

          <div className="req-grid req-grid--2col" style={{ marginTop: '16px' }}>
            <div className="req-field">
              <label>Deployment Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
              <span className="req-field-hint">Expected date for workforce to mobilize on site</span>
            </div>

            <div className="req-field">
              <label>Engagement Duration *</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 3 Months, 6 Months, Long-term"
                required
              />
              <span className="req-field-hint">Estimated project duration or contract period</span>
            </div>
          </div>
        </div>

        {/* Section 4: Budget & Commercials */}
        <div className="req-section">
          <div className="req-section-head">
            <div className="req-section-icon req-section-icon--green">
              <IconRupee size={18} />
            </div>
            <div>
              <h3 className="req-section-title">4. Commercial Budget (Optional)</h3>
              <p className="req-section-hint">Set rate expectations to guide contractor proposals</p>
            </div>
          </div>

          <div className="req-grid req-grid--2col">
            <div className="req-field">
              <label>Budget Min (₹ / worker / day)</label>
              <input
                type="number"
                name="budgetMin"
                value={formData.budgetMin ?? ''}
                onChange={handleChange}
                placeholder="e.g. 700"
              />
              <span className="req-field-hint">Minimum daily commercial rate bracket</span>
            </div>

            <div className="req-field">
              <label>Budget Max (₹ / worker / day)</label>
              <input
                type="number"
                name="budgetMax"
                value={formData.budgetMax ?? ''}
                onChange={handleChange}
                placeholder="e.g. 950"
              />
              <span className="req-field-hint">Maximum approved budget per worker</span>
            </div>
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="req-form-footer">
          <Link href="/business/requirements" className="req-btn-cancel">
            Cancel
          </Link>

          <div className="req-form-footer-right">
            <button
              type="button"
              className="req-btn-draft"
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save as Draft'}
            </button>

            <button
              type="button"
              className="req-btn-publish"
              onClick={() => handleSubmit('publish')}
              disabled={submitting}
            >
              {submitting ? 'Publishing…' : 'Publish Requirement →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
