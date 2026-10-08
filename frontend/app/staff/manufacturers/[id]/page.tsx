'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getStaffManufacturerById, type StaffManufacturerDetail } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import {
  IconArrowLeft,
  IconBuilding,
  IconMapPin,
  IconRequirements,
} from '@/components/ui/Icons';
import '../staff-manufacturers.css';

export default function StaffManufacturerDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [manufacturer, setManufacturer] = useState<StaffManufacturerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getStaffManufacturerById(id)
      .then(({ data }) => setManufacturer(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading manufacturer details…" />;
  }

  if (!manufacturer) {
    return (
      <div className="staff-contractors-page">
        <Link href="/staff/manufacturers" className="staff-new-back-link">
          <IconArrowLeft size={15} style={{ marginRight: 6 }} /> Back to Manufacturers
        </Link>
        <p>Manufacturer not found.</p>
      </div>
    );
  }

  return (
    <div className="staff-contractors-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <Link href="/staff/manufacturers" className="staff-new-back-link" style={{ marginBottom: '16px' }}>
        <IconArrowLeft size={15} style={{ marginRight: 6 }} /> Back to Manufacturers Directory
      </Link>

      {/* Header Card */}
      <div className="staff-contractor-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f8b82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enterprise Manufacturer
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#102a2a', margin: '4px 0 8px' }}>
              {manufacturer.company_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13.5px' }}>
              <IconMapPin size={14} />
              {[manufacturer.city, manufacturer.state].filter(Boolean).join(', ') || 'No location set'}
            </div>
          </div>
          <span className="staff-avail-pill" style={{ background: '#f0fdfa', color: '#0f8b82', borderColor: '#ccfbf1', padding: '6px 14px', fontSize: '13px' }}>
            Account Active
          </span>
        </div>

        <div className="staff-contractor-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <div className="staff-meta-item">
            <span className="staff-meta-label">Login Email</span>
            <span className="staff-meta-val">{manufacturer.email}</span>
          </div>
          <div className="staff-meta-item">
            <span className="staff-meta-label">Phone</span>
            <span className="staff-meta-val">{manufacturer.phone || '—'}</span>
          </div>
          <div className="staff-meta-item">
            <span className="staff-meta-label">Industry</span>
            <span className="staff-meta-val">{manufacturer.industry || 'General Manufacturing'}</span>
          </div>
          <div className="staff-meta-item">
            <span className="staff-meta-label">Member Since</span>
            <span className="staff-meta-val">{new Date(manufacturer.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Posted Requirements */}
      <div className="staff-contractor-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#102a2a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconRequirements size={18} />
            Posted Manpower Requirements ({manufacturer.requirements?.length || 0})
          </h2>
        </div>

        {!manufacturer.requirements || manufacturer.requirements.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13.5px', margin: 0 }}>This manufacturer has not posted any manpower requirements yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {manufacturer.requirements.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: '14px 18px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '14.5px', color: '#102a2a', display: 'block' }}>{req.title}</strong>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    {req.workers_required} workers needed • Location: {[req.city, req.state].filter(Boolean).join(', ') || req.location || 'Not specified'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="staff-avail-pill" style={{ fontSize: '11.5px', padding: '3px 10px' }}>
                    {req.status}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
