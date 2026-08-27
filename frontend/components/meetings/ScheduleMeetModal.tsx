'use client';

import React, { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import './ScheduleMeetModal.css';

interface ScheduleMeetModalProps {
  enquiryId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleMeetModal({ enquiryId, onClose, onSuccess }: ScheduleMeetModalProps) {
  const [title, setTitle] = useState('Project Discussion');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('16:00');
  const [duration, setDuration] = useState(30);

  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check Google Calendar connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(getApiUrl('/google/calendar/status'), {
          credentials: 'include',
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setCalendarConnected(json.data.isConnected);
        } else {
          setCalendarConnected(false);
        }
      } catch (err) {
        setCalendarConnected(false);
      }
    };
    checkStatus();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(getApiUrl('/google/calendar/connect'), {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.data?.authUrl) {
        throw new Error(json.error?.message || 'Failed to generate Google consent URL');
      }
      window.location.href = json.data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Google connection error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError('Please fill in all required meeting fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const scheduledStart = new Date(`${date}T${time}:00`).toISOString();

      const res = await fetch(getApiUrl(`/enquiries/${enquiryId}/meetings`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          scheduledStart,
          durationMinutes: duration,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to schedule Google Meet');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule Google Meet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meet-modal__backdrop" onClick={onClose}>
      <div className="meet-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="meet-modal__header">
          <h3>Schedule Google Meet</h3>
          <button className="meet-modal__close" onClick={onClose}>×</button>
        </div>

        {error && <div className="meet-modal__error">{error}</div>}

        <form onSubmit={handleSubmit} className="meet-modal__form">
          <div className="meet-modal__field">
            <label>Meeting Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Labour Requirement Discussion"
              required
            />
          </div>

          <div className="meet-modal__row">
            <div className="meet-modal__field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="meet-modal__field">
              <label>Start Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="meet-modal__field">
            <label>Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          <div className="meet-modal__actions">
            {calendarConnected === false ? (
              <Button type="button" variant="primary" onClick={handleConnectGoogle} disabled={loading}>
                {loading ? 'Connecting…' : '🔗 Connect Google Calendar'}
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Scheduling…' : '📹 Create Google Meet'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
