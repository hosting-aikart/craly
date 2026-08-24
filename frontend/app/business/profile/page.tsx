'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getMyProfile, updateMyProfile, type BusinessProfile } from '@/lib/api/profile';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => {
        if (data.role === 'business') {
          setProfile(data);
          setIndustry(data.industry ?? '');
          setCity(data.city ?? '');
          setState(data.state ?? '');
          setPhone(data.phone ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateMyProfile({ industry, city, state, phone });
      setSuccess('Profile details saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <WorkspacePageHeader
        title="Company Profile"
        subtitle="Manage your business information and operating location."
      />
      {loading ? (
        <LoadingState label="Loading profile…" />
      ) : profile && (
        <div style={{ maxWidth: '640px', background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--craly-border)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--craly-navy)', color: 'var(--craly-white)', fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.company_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--craly-navy)' }}>{profile.company_name}</h2>
              <span style={{ fontSize: '13px', color: 'var(--craly-muted)' }}>Business Account</span>
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px' }}>{error}</div>}
          {success && <div style={{ background: 'var(--craly-mint)', border: '1px solid var(--craly-teal)', color: 'var(--craly-teal-dark)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13.5px' }}>{success}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--craly-navy)', marginBottom: '6px' }}>Industry / Field</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. EPC Construction, Manufacturing, Logistics"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--craly-navy)', marginBottom: '6px' }}>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Amravati"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--craly-navy)', marginBottom: '6px' }}>State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--craly-navy)', marginBottom: '6px' }}>Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--craly-border)', fontSize: '14px' }}
              />
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--craly-muted)' }}>
                Only shared with Craly Staff after you select a contractor — never with the contractor directly.
              </p>
            </div>

            <div style={{ marginTop: '12px' }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Company Profile'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
