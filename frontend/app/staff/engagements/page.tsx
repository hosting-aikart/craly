'use client';

import React, { useEffect, useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getStaffEngagements, updateStaffEngagementStatus, type StaffEngagementItem } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import {
  IconHandshake,
  IconMapPin,
  IconPhone,
  IconMail,
  IconUsers,
  IconCalendar,
  IconBuilding,
} from '@/components/ui/Icons';
import './staff-engagements.css';

const ENGAGEMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'SELECTED', label: 'SELECTED' },
  { value: 'CONTACTING', label: 'CONTACTING' },
  { value: 'IN_DISCUSSION', label: 'IN DISCUSSION' },
  { value: 'CONFIRMED', label: 'CONFIRMED' },
  { value: 'CLOSED', label: 'CLOSED' },
];

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

  return (
    <div className="staff-engagements-page">
      <WorkspacePageHeader
        title="Manufacturer - Contractor Engagements"
        subtitle="Coordinate selected engagements, facilitate discussions, and confirm deal handoffs."
      />

      {loading ? (
        <LoadingState label="Loading Engagements…" />
      ) : engagements.length === 0 ? (
        <EmptyState
          icon={<IconHandshake size={32} />}
          title="No Active Engagements"
          subtitle="There are currently no manufacturer selection events to coordinate."
        />
      ) : (
        <div className="engagements-list">
          {engagements.map((item) => (
            <div key={item.application_id} className="engagement-card">
              <div className="engagement-card__header">
                <div>
                  <span className="engagement-requirement-loc">
                    <IconMapPin size={12} style={{ marginRight: 4 }} />
                    {item.requirement_location}
                  </span>
                  <h3 className="engagement-requirement-title">{item.requirement_title}</h3>
                </div>
                <div className="engagement-status-selector">
                  <span className="engagement-status-label">Status</span>
                  <CustomSelect
                    options={ENGAGEMENT_STATUS_OPTIONS}
                    value={item.application_status}
                    onChange={(val) => handleStatusChange(item.application_id, val)}
                    className="engagement-custom-select"
                  />
                </div>
              </div>

              <div className="engagement-card__grid">
                <div className="engagement-party-box">
                  <span className="party-lbl">
                    <IconBuilding size={12} style={{ marginRight: 4 }} />
                    Manufacturer Company
                  </span>
                  <strong className="party-name">{item.manufacturer_name}</strong>
                  {item.manufacturer_city && <span className="party-sub">{item.manufacturer_city}</span>}
                  {item.manufacturer_phone && (
                    <span className="party-sub">
                      <IconPhone size={12} style={{ marginRight: 4 }} />
                      {item.manufacturer_phone}
                    </span>
                  )}
                  {item.manufacturer_email && (
                    <span className="party-sub">
                      <IconMail size={12} style={{ marginRight: 4 }} />
                      {item.manufacturer_email}
                    </span>
                  )}
                </div>

                <div className="engagement-party-box">
                  <span className="party-lbl">
                    <IconUsers size={12} style={{ marginRight: 4 }} />
                    Selected Contractor
                  </span>
                  <strong className="party-name">{item.contractor_name}</strong>
                  {item.contractor_phone && (
                    <span className="party-sub">
                      <IconPhone size={12} style={{ marginRight: 4 }} />
                      {item.contractor_phone}
                    </span>
                  )}
                  {item.contractor_email && (
                    <span className="party-sub">
                      <IconMail size={12} style={{ marginRight: 4 }} />
                      {item.contractor_email}
                    </span>
                  )}
                </div>

                <div className="engagement-party-box">
                  <span className="party-lbl">
                    <IconCalendar size={12} style={{ marginRight: 4 }} />
                    Workforce & Terms
                  </span>
                  <strong className="party-name">{item.proposed_workforce} Workers Proposed</strong>
                  <span className="party-sub">
                    Available: {new Date(item.availability_date).toLocaleDateString()}
                    {item.proposed_rate ? ` • ₹${item.proposed_rate}/day` : ''}
                  </span>
                </div>
              </div>

              <div className="engagement-card__footer">
                <span>Selection Date: {new Date(item.selection_date).toLocaleDateString()}</span>
                <span className="engagement-req-id">Requirement ID: {item.requirement_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
