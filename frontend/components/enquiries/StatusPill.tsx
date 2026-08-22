import type { EnquiryStatus } from '@/lib/api/enquiries';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { statusLabel, statusTone, type ViewerRole } from './enquiryStatus';
import './StatusPill.css';

interface StatusPillProps {
  status: EnquiryStatus;
  viewer: ViewerRole;
}

export default function StatusPill({ status, viewer }: StatusPillProps) {
  const { t } = useLanguage();
  return (
    <span className={`status-pill status-pill--${statusTone(status)}`}>
      {statusLabel(status, viewer, t)}
    </span>
  );
}
