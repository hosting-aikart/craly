import Link from 'next/link';
import type { Enquiry } from '@/lib/api/enquiries';
import { relativeTime } from '@/lib/util/relativeTime';
import { isUnread, type ViewerRole } from './enquiryStatus';
import StatusPill from './StatusPill';
import './EnquiryListItem.css';

interface EnquiryListItemProps {
  enquiry: Enquiry;
  viewer: ViewerRole;
  href: string;
}

/** One row in either /business/enquiries or /contractor/enquiries. */
export default function EnquiryListItem({ enquiry, viewer, href }: EnquiryListItemProps) {
  const unread = isUnread(enquiry, viewer);

  return (
    <Link href={href} className={`enquiry-item ${unread ? 'enquiry-item--unread' : ''}`}>
      <span className="enquiry-item__dot" aria-hidden="true" />

      <div className="enquiry-item__body">
        <div className="enquiry-item__top">
          <h3>{enquiry.other_party_name}</h3>
          <span className="enquiry-item__time">{relativeTime(enquiry.updated_at)}</span>
        </div>

        <p className="enquiry-item__requirement">
          {enquiry.category_name ?? 'General enquiry'}
          {enquiry.workers_required != null && ` • ${enquiry.workers_required} workers`}
          {enquiry.location && ` • ${enquiry.location}`}
        </p>

        <p className="enquiry-item__preview">&ldquo;{enquiry.message}&rdquo;</p>
      </div>

      <StatusPill status={enquiry.status} viewer={viewer} />
    </Link>
  );
}
