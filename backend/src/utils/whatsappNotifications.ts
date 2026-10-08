import { queueWhatsAppTemplate, type WhatsAppTemplateName } from './whatsapp';

// Craly business event → WhatsApp template mapping. Controllers call these
// only after the triggering state change has actually happened (each call
// site guards against no-op transitions); these functions pick the template
// and parameters and store a durable pg-boss job (see queueWhatsAppTemplate).
// They never throw, and resolve once the job is stored.
//
// Idempotency: every job gets the key
//   <template>:<entity id>:<recipient user id>:<transition marker>
// where the marker identifies this particular occurrence of the event
// (usually the row's updated_at written by the same statement that made the
// transition). Re-enqueuing the same occurrence is a no-op; a genuinely new
// occurrence (e.g. re-selected after a rejection) gets a new marker.
//
// Contractor messages all say "log in to Craly", so they are only sent to
// contractors who have a login (contractor_profiles.user_id is set) —
// staff-managed records created from a "List Your Company" lead have none.
// That matches when the existing in-app notifications are sent.

/** Something that identifies one occurrence of an event — a timestamp from the transition, or a fixed label for one-time events. */
export type TransitionMarker = string | Date;

interface ContractorRecipient {
  contractorId: string;
  userId: string | null | undefined;
  phone: string | null | undefined;
  companyName: string;
}

function markerText(marker: TransitionMarker): string {
  return marker instanceof Date ? marker.toISOString() : String(marker);
}

async function queueToContractor(
  contractor: ContractorRecipient,
  template: WhatsAppTemplateName,
  parameters: string[],
  entity: { entityType: string; entityId: string },
  marker: TransitionMarker,
): Promise<void> {
  if (!contractor.userId) return;
  await queueWhatsAppTemplate({
    to: contractor.phone,
    template,
    parameters,
    context: { ...entity, userId: contractor.userId },
    idempotencyKey: `${template}:${entity.entityId}:${contractor.userId}:${markerText(marker)}`,
  });
}

/** A contractor login was created (self-signup or Staff-created). Once per profile. */
export function notifyContractorWelcome(contractor: ContractorRecipient): Promise<void> {
  return queueToContractor(contractor, 'contractor_welcome', [contractor.companyName], {
    entityType: 'contractor_profile',
    entityId: contractor.contractorId,
  }, 'account-created');
}

/** A contractor finished onboarding and their profile is now waiting for review. Once per profile (onboarding never un-completes). */
export function notifyContractorProfileSubmitted(contractor: ContractorRecipient): Promise<void> {
  return queueToContractor(contractor, 'contractor_verification_pending', [contractor.companyName], {
    entityType: 'contractor_profile',
    entityId: contractor.contractorId,
  }, 'onboarding-completed');
}

const REVIEW_STATUSES = ['pending', 'under_review'];

/**
 * contractor_profiles.verification_status changed. Sends at most one
 * message per real transition:
 *   → pending / under_review   contractor_verification_pending (only when
 *                              coming from outside those two — pending →
 *                              under_review is still "under review")
 *   → verified                 contractor_verification_approved
 *   → rejected                 contractor_verification_rejected
 *   → needs_changes            contractor_verification_needs_changes
 * `marker` = the profile's updated_at from the UPDATE that changed it.
 */
export async function notifyContractorVerificationChange(
  contractor: ContractorRecipient,
  previousStatus: string | null | undefined,
  newStatus: string,
  marker: TransitionMarker,
): Promise<void> {
  if (previousStatus === newStatus) return;

  let template: 'contractor_verification_pending' | 'contractor_verification_approved'
    | 'contractor_verification_rejected' | 'contractor_verification_needs_changes';
  if (REVIEW_STATUSES.includes(newStatus)) {
    if (previousStatus && REVIEW_STATUSES.includes(previousStatus)) return;
    template = 'contractor_verification_pending';
  } else if (newStatus === 'verified') {
    template = 'contractor_verification_approved';
  } else if (newStatus === 'rejected') {
    template = 'contractor_verification_rejected';
  } else if (newStatus === 'needs_changes') {
    template = 'contractor_verification_needs_changes';
  } else {
    return;
  }

  await queueToContractor(contractor, template, [contractor.companyName], {
    entityType: 'contractor_profile',
    entityId: contractor.contractorId,
  }, `${newStatus}@${markerText(marker)}`);
}

// Short display names for contractor_documents.document_type
// (validators/documentValidators.ts DOCUMENT_TYPES).
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  gst: 'GST',
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  labor_license: 'Labour Licence',
  msme: 'MSME',
  pf_registration: 'PF Registration',
  esic_registration: 'ESIC Registration',
  business_registration: 'Business Registration',
  industry_license: 'Industry Licence',
  safety_certification: 'Safety Certification',
  compliance_certificate: 'Compliance Certificate',
  compliance_report: 'Compliance Report',
  other_certificate: 'Certificate',
  verification_evidence: 'Verification Evidence',
  other: 'Other',
};

// contractor_documents.status review outcomes (reviewDocumentSchema / reviewStaffDocumentSchema).
const DOCUMENT_REVIEW_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  replacement_requested: 'Replacement requested',
};

export function documentTypeLabel(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType]
    ?? documentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A KYC document's review status changed. `marker` = the document's updated_at from that review. */
export async function notifyKycDocumentReviewed(
  contractor: ContractorRecipient,
  document: { id: string; documentType: string },
  decision: string,
  marker: TransitionMarker,
): Promise<void> {
  const statusLabel = DOCUMENT_REVIEW_LABELS[decision];
  if (!statusLabel) return;
  await queueToContractor(contractor, 'kyc_document_reviewed', [contractor.companyName, documentTypeLabel(document.documentType), statusLabel], {
    entityType: 'contractor_document',
    entityId: document.id,
  }, `${decision}@${markerText(marker)}`);
}

interface OpportunitySummary {
  id: string;
  title: string;
  location: string | null;
  city: string | null;
  state: string | null;
  workers_required: number;
  published_at?: string | Date | null;
}

/** A requirement was published and this contractor matches it (same rule as the in-app NEW_MATCHING_OPPORTUNITY). One per contractor per publish. */
export function notifyNewOpportunity(contractor: ContractorRecipient, requirement: OpportunitySummary): Promise<void> {
  const location = requirement.location?.trim()
    || [requirement.city, requirement.state].filter(Boolean).join(', ')
    || 'Not specified';
  return queueToContractor(contractor, 'new_opportunity', [contractor.companyName, requirement.title, location, String(requirement.workers_required)], {
    entityType: 'manpower_requirement',
    entityId: requirement.id,
  }, `published@${requirement.published_at ? markerText(new Date(requirement.published_at)) : 'unknown'}`);
}

/**
 * Application status events sent to the contractor who applied. `marker` =
 * the application's updated_at from the guarded UPDATE that made the
 * transition (application_submitted: 'submitted', since an application is
 * created once).
 */
export function notifyApplicationEvent(
  contractor: ContractorRecipient,
  template: 'application_submitted' | 'application_selected' | 'application_rejected'
    | 'application_not_selected' | 'engagement_confirmed',
  application: { id: string; requirementTitle: string },
  marker: TransitionMarker,
): Promise<void> {
  return queueToContractor(contractor, template, [contractor.companyName, application.requirementTitle], {
    entityType: 'application',
    entityId: application.id,
  }, marker);
}

/** contractor_profiles.is_unlisted changed. `marker` = the profile's updated_at from that change. */
export function notifyContractorListingChange(
  contractor: ContractorRecipient,
  isUnlisted: boolean,
  reason: string | null | undefined,
  marker: TransitionMarker,
): Promise<void> {
  const entity = { entityType: 'contractor_profile', entityId: contractor.contractorId };
  return isUnlisted
    ? queueToContractor(contractor, 'contractor_unlisted', [contractor.companyName, reason?.trim() || 'Not specified'], entity, marker)
    : queueToContractor(contractor, 'contractor_relisted', [contractor.companyName], entity, marker);
}

/** A manufacturer received a new application on one of their requirements. Once per application. */
export async function notifyManufacturerNewApplication(
  manufacturer: { userId: string | null | undefined; phone: string | null | undefined; companyName: string },
  application: { id: string; requirementTitle: string },
): Promise<void> {
  if (!manufacturer.userId) return;
  await queueWhatsAppTemplate({
    to: manufacturer.phone,
    template: 'new_application',
    parameters: [manufacturer.companyName, application.requirementTitle],
    context: { entityType: 'application', entityId: application.id, userId: manufacturer.userId },
    idempotencyKey: `new_application:${application.id}:${manufacturer.userId}:submitted`,
  });
}
