import type { EnquiryStatus } from '@/lib/api/enquiries';

export type ViewerRole = 'business' | 'contractor';

/**
 * The backend stores five precise states, but each side of the
 * conversation reads them differently: a contractor already knows they've
 * "viewed" something the moment they're looking at it, so 'new' and
 * 'viewed' both just mean "awaiting my reply" from their seat. A business
 * cares about that distinction (has the contractor even opened it yet?).
 */
export function statusLabel(status: EnquiryStatus, viewer: ViewerRole): string {
  if (viewer === 'contractor') {
    switch (status) {
      case 'new':
      case 'viewed':
        return 'New';
      case 'responded':
        return 'Responded';
      case 'in_discussion':
        return 'In Discussion';
      case 'closed':
        return 'Closed';
    }
  }
  switch (status) {
    case 'new':
      return 'Pending';
    case 'viewed':
      return 'Viewed';
    case 'responded':
      return 'Responded';
    case 'in_discussion':
      return 'In Discussion';
    case 'closed':
      return 'Closed';
  }
}

export type StatusTone = 'new' | 'active' | 'closed';

export function statusTone(status: EnquiryStatus): StatusTone {
  if (status === 'closed') return 'closed';
  if (status === 'responded' || status === 'in_discussion') return 'active';
  return 'new';
}

/** Contractor inbox tabs (§8) collapse the 5 backend states into 3 groups. */
export const CONTRACTOR_TABS = ['all', 'new', 'responded', 'closed'] as const;
export type ContractorTab = (typeof CONTRACTOR_TABS)[number];

export function matchesContractorTab(status: EnquiryStatus, tab: ContractorTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'new') return status === 'new' || status === 'viewed';
  if (tab === 'responded') return status === 'responded' || status === 'in_discussion';
  return status === 'closed';
}

export function isUnread(row: { status: EnquiryStatus; has_unread?: boolean }, viewer: ViewerRole): boolean {
  if (viewer === 'contractor' && row.status === 'new') return true;
  return Boolean(row.has_unread);
}
