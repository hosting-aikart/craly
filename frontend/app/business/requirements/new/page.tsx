'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { createBusinessRequirement, type CreateRequirementInput } from '@/lib/api/businessPortal';
import Button from '@/components/ui/Button';
import '@/components/AuthForm.css';

export default function CreateRequirementPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<CreateRequirementInput>({
    title: '',
    description: '',
    industry: '',
    location: '',
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
      setError('Location is required');
      return;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }
    if (!formData.workersRequired || formData.workersRequired < 1) {
      setError('Workers required must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createBusinessRequirement({
        ...formData,
        action,
      });
      router.push(`/business/requirements/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save requirement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <WorkspacePageHeader
        title="Create Manpower Requirement"
        subtitle="Specify workforce counts, required skills, and timelines for contractors."
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--craly-white)', padding: '28px', borderRadius: '16px', border: '1px solid var(--craly-border)' }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
              Requirement Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. 25 Automotive Assembly Line Technicians"
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Industry / Domain
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. Automotive, Manufacturing, Logistics"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Location / City *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Chakan, Pune, Maharashtra"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Workers Required *
              </label>
              <input
                type="number"
                name="workersRequired"
                value={formData.workersRequired || ''}
                onChange={handleChange}
                min="1"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Experience Required (Years)
              </label>
              <input
                type="number"
                name="experienceRequired"
                value={formData.experienceRequired ?? ''}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 2"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Duration *
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 3 Months, 6 Months"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              name="requiredSkills"
              value={typeof formData.requiredSkills === 'string' ? formData.requiredSkills : formData.requiredSkills?.join(', ')}
              onChange={handleChange}
              placeholder="e.g. Welding, Assembly, Machine Operation, QC"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Budget Min (₹ per worker/day)
              </label>
              <input
                type="number"
                name="budgetMin"
                value={formData.budgetMin ?? ''}
                onChange={handleChange}
                placeholder="e.g. 700"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
                Budget Max (₹ per worker/day)
              </label>
              <input
                type="number"
                name="budgetMax"
                value={formData.budgetMax ?? ''}
                onChange={handleChange}
                placeholder="e.g. 1000"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--craly-navy)' }}>
              Detailed Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide work shift timings, specific project requirements, and facility information..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--craly-border)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Draft'}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit('publish')}
              disabled={submitting}
            >
              {submitting ? 'Publishing…' : 'Publish Requirement'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
