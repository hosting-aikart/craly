import type { EnquiryStatus } from '@/lib/api/enquiries';
import { statusLabel, statusTone, type ViewerRole } from './enquiryStatus';
import './StatusPill.css';

interface StatusPillProps {
  status: EnquiryStatus;
  viewer: ViewerRole;
}

export default function StatusPill({ status, viewer }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${statusTone(status)}`}>
      {statusLabel(status, viewer)}
    </span>
  );
}
