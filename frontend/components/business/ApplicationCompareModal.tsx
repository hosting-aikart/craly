'use client';

import React from 'react';
import { type ApplicationReceived } from '@/lib/api/businessPortal';
import Button from '@/components/ui/Button';
import { IconUsers, IconCalendar, IconRupee, IconMapPin } from '@/components/ui/Icons';
import './ApplicationCompareModal.css';

interface ApplicationCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: ApplicationReceived[];
  onSelectContractor: (app: ApplicationReceived) => void;
  selectingId?: string | null;
}

export default function ApplicationCompareModal({
  isOpen,
  onClose,
  applications,
  onSelectContractor,
  selectingId,
}: ApplicationCompareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="compare-modal__backdrop" onClick={onClose}>
      <div className="compare-modal__container" onClick={(e) => e.stopPropagation()}>
        <div className="compare-modal__header">
          <div>
            <h2 className="compare-modal__title">Compare Applications</h2>
            <p className="compare-modal__subtitle">
              Comparing {applications.length} contractor proposals side-by-side
            </p>
          </div>
          <button type="button" className="compare-modal__close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="compare-modal__body compare-modal__body--empty">
            <p>No applications selected for comparison.</p>
          </div>
        ) : (
          <div className="compare-modal__body">
            <div className="compare-grid">
              {applications.map((app) => {
                const isSelected = app.application_status === 'SELECTED';
                const isSelecting = selectingId === app.id;

                return (
                  <div key={app.id} className={`compare-card ${isSelected ? 'compare-card--selected' : ''}`}>
                    <div className="compare-card__header">
                      <h3 className="compare-card__name">{app.contractor_name}</h3>
                      <span className={`status-badge status-badge--${app.application_status.toLowerCase()}`}>
                        {app.application_status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="compare-card__section">
                      <span className="compare-card__label">Workforce Offered</span>
                      <strong className="compare-card__value compare-card__value--highlight">
                        <IconUsers size={14} className="inline-icon" /> {app.proposed_workforce} Workers
                      </strong>
                    </div>

                    <div className="compare-card__section">
                      <span className="compare-card__label">Availability Date</span>
                      <span className="compare-card__value">
                        <IconCalendar size={14} className="inline-icon" /> {new Date(app.availability_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="compare-card__section">
                      <span className="compare-card__label">Proposed Rate</span>
                      <span className="compare-card__value">
                        <IconRupee size={14} className="inline-icon" /> {app.proposed_rate ? `₹${app.proposed_rate}` : 'Negotiable'}
                      </span>
                    </div>

                    <div className="compare-card__section">
                      <span className="compare-card__label">Location / Experience</span>
                      <span className="compare-card__value">
                        <IconMapPin size={14} className="inline-icon" /> {app.contractor_city || app.contractor_state || 'Not specified'}
                        {app.contractor_experience_years ? ` • ${app.contractor_experience_years} yrs exp` : ''}
                      </span>
                    </div>

                    <div className="compare-card__section">
                      <span className="compare-card__label">Industry / Capacity / Availability</span>
                      <span className="compare-card__value">
                        {app.contractor_industry || 'Industry N/A'}
                        {app.contractor_workforce_size != null ? ` • ${app.contractor_workforce_size} total workforce` : ''}
                        {app.contractor_availability ? ` • ${app.contractor_availability.replace(/_/g, ' ')}` : ''}
                      </span>
                    </div>

                    <div className="compare-card__section compare-card__section--flex">
                      <span className="compare-card__label">Relevant Experience & Message</span>
                      <p className="compare-card__text">
                        {app.relevant_experience || app.message || 'No additional remarks provided.'}
                      </p>
                    </div>

                    <div className="compare-card__footer">
                      {isSelected ? (
                        <div className="compare-card__selected-pill">
                          ✓ Contractor Selected
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => onSelectContractor(app)}
                          disabled={Boolean(selectingId)}
                          style={{ width: '100%' }}
                        >
                          {isSelecting ? 'Selecting…' : 'Select Contractor'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
