'use client';

import React, { useEffect, useState } from 'react';
import { getStaffEngagements, updateStaffEngagementStatus, type StaffEngagementItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './staff-engagements.css';

export default function StaffEngagementsPage() {
  const [engagements, setEngagements] = useState<StaffEngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchEngagements = () => {
    getStaffEngagements()
      .then(({ data }) => setEngagements(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEngagements();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateStaffEngagementStatus(id, newStatus);
      fetchEngagements();
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SELECTED') return 'engagement-status--selected';
    if (s === 'CONTACTING') return 'engagement-status--contacting';
    if (s === 'IN_DISCUSSION') return 'engagement-status--discussion';
    if (s === 'CONFIRMED') return 'engagement-status--confirmed';
    if (s === 'CLOSED') return 'engagement-status--closed';
    return 'engagement-status--default';
  };

  return (
    <div className="staff-engagements-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manufacturer - Contractor Engagements</h1>
          <p className="page-subtitle">
            Coordinate selected engagements, facilitate discussions, and confirm deal handoffs.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading Engagements…" />
      ) : engagements.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No Active Engagements"
          subtitle="There are currently no manufacturer selection events to coordinate."
        />
      ) : (
        <div className="engagements-list">
          {engagements.map((item) => (
            <div key={item.application_id} className="engagement-card">
              <div className="engagement-card__header">
                <div>
                  <span className="engagement-requirement-loc">📍 {item.requirement_location}</span>
                  <h3 className="engagement-requirement-title">{item.requirement_title}</h3>
                </div>
                <div className="engagement-status-selector">
                  <span className={`status-badge ${getStatusBadgeClass(item.application_status)}`}>
                    {item.application_status.replace(/_/g, ' ')}
                  </span>
                  <select
                    disabled={updatingId === item.application_id}
                    value={item.application_status}
                    onChange={(e) => handleStatusChange(item.application_id, e.target.value)}
                    className="status-dropdown"
                  >
                    <option value="SELECTED">SELECTED</option>
                    <option value="CONTACTING">CONTACTING</option>
                    <option value="IN_DISCUSSION">IN DISCUSSION</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="engagement-card__grid">
                <div className="engagement-party-box">
                  <span className="party-lbl">Manufacturer Company</span>
                  <strong className="party-name">{item.manufacturer_name}</strong>
                  {item.manufacturer_city && <span className="party-sub">{item.manufacturer_city}</span>}
                  {item.manufacturer_phone && <span className="party-sub">📞 {item.manufacturer_phone}</span>}
                  {item.manufacturer_email && <span className="party-sub">✉️ {item.manufacturer_email}</span>}
                </div>

                <div className="engagement-party-box">
                  <span className="party-lbl">Selected Contractor</span>
                  <strong className="party-name">{item.contractor_name}</strong>
                  {item.contractor_phone && <span className="party-sub">📞 {item.contractor_phone}</span>}
                  {item.contractor_email && <span className="party-sub">✉️ {item.contractor_email}</span>}
                </div>

                <div className="engagement-party-box">
                  <span className="party-lbl">Workforce & Terms</span>
                  <strong className="party-name">{item.proposed_workforce} Workers Proposed</strong>
                  <span className="party-sub">
                    Available: {new Date(item.availability_date).toLocaleDateString()}
                    {item.proposed_rate ? ` • ₹${item.proposed_rate}/day` : ''}
                  </span>
                </div>
              </div>

              <div className="engagement-card__footer">
                <span>Selection Date: {new Date(item.selection_date).toLocaleDateString()}</span>
                <span>Requirement ID: {item.requirement_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
