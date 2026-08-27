import type { EnquiryStatus } from '@/lib/api/enquiries';

export type ViewerRole = 'business' | 'contractor' | 'admin';

/**
 * Settled onto inquiries.status's one final lifecycle during the
 * contractor-architecture reconciliation (see docs/open-decisions.md) —
 * NEW -> UNDER_REVIEW -> BROKERING -> CONTACTED -> IN_PROGRESS ->
 * COMPLETED -> WON/LOST/CLOSED_EXPIRED, with DECLINED as an early exit.
 * Business and "contractor" (now: internal staff acting on their behalf)
 * read the same values with slightly different labels.
 */
export function statusLabel(status: EnquiryStatus, _viewer: ViewerRole, t?: any): string {
  switch (status) {
    case 'NEW':
      return t?.enquiries?.statusPending || 'New';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'BROKERING':
      return t?.enquiries?.statusAccepted || 'Brokering';
    case 'CONTACTED':
      return 'Contacted';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'WON':
      return 'Won';
    case 'LOST':
      return 'Lost';
    case 'CLOSED_EXPIRED':
      return t?.enquiries?.statusClosed || 'Closed';
    case 'DECLINED':
      return t?.enquiries?.statusDeclined || 'Declined';
    default:
      return status;
  }
}

export type StatusTone = 'new' | 'active' | 'closed';

export function statusTone(status: EnquiryStatus): StatusTone {
  if (status === 'DECLINED' || status === 'LOST' || status === 'CLOSED_EXPIRED') return 'closed';
  if (status === 'NEW' || status === 'UNDER_REVIEW') return 'new';
  return 'active'; // BROKERING, CONTACTED, IN_PROGRESS, COMPLETED, WON
}

export const CONTRACTOR_TABS = ['all', 'pending', 'accepted', 'closed'] as const;
export type ContractorTab = (typeof CONTRACTOR_TABS)[number];

export function matchesContractorTab(status: EnquiryStatus, tab: ContractorTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'pending') return status === 'NEW' || status === 'UNDER_REVIEW';
  if (tab === 'accepted') return status === 'BROKERING' || status === 'CONTACTED' || status === 'IN_PROGRESS';
  return status === 'DECLINED' || status === 'LOST' || status === 'CLOSED_EXPIRED' || status === 'COMPLETED' || status === 'WON';
}

export function isUnread(row: { status: EnquiryStatus; has_unread?: boolean }, viewer: ViewerRole): boolean {
  if (viewer === 'contractor' && row.status === 'NEW') return true;
  return Boolean(row.has_unread);
}
