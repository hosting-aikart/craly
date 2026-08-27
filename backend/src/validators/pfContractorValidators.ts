import { z } from 'zod';

export const createPfContractorSchema = z.object({
  // contractor_profiles has one name field (`company_name`) — field staff
  // enter whatever the contractor operates under, individual or firm.
  companyName: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(100).optional(),
  serviceAreas: z.array(z.string().trim().max(100)).optional(),
  yearsInBusiness: z.number().int().min(0).max(100).optional(),
  workforceCount: z.number().int().min(0).max(100000).optional(),
  overseasInterest: z.boolean().optional(),
  description: z.string().trim().max(2000).optional(),
  // Internal-only field-collection notes — never shown in the public
  // directory, distinct from `description` (spec §6).
  notes: z.string().trim().max(2000).optional(),
  categoryIds: z.array(z.number().int()).optional(),
});
export type CreatePfContractorInput = z.infer<typeof createPfContractorSchema>;

// Same fields as create, all optional — a field agent edits whatever
// changed after a follow-up call without resubmitting the whole record.
export const updatePfContractorSchema = createPfContractorSchema.partial();
export type UpdatePfContractorInput = z.infer<typeof updatePfContractorSchema>;

// Matches contractor_profiles.verification_status's DB check constraint —
// Pending -> Under Review -> Verified | Rejected | Needs Changes (§9). This
// endpoint is Ops Head only (enforced in pfRoutes.ts); Field Staff's one
// allowed transition (pending -> under_review) goes through the separate,
// less-privileged submitForReviewSchema/route below.
export const updateVerificationSchema = z
  .object({
    status: z.enum(['pending', 'under_review', 'verified', 'rejected', 'needs_changes']),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.status === 'rejected' || val.status === 'needs_changes') && !val.note) {
      ctx.addIssue({ code: 'custom', message: 'A note is required when rejecting or requesting changes', path: ['note'] });
    }
  });

export const updateAvailabilitySchema = z.object({
  availability: z.enum(['AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED']),
  note: z.string().trim().max(500).optional(),
});
