import { z } from 'zod';

// Public form — intentionally short (§3 of the onboarding-architecture spec).
export const createContractorRequestSchema = z.object({
  companyName: z.string().trim().min(1, 'Company / contractor name is required').max(200),
  contactPerson: z.string().trim().min(1, 'Contact person is required').max(200),
  phone: z.string().trim().min(1, 'Phone number is required').max(40),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required').max(100),
  industry: z.string().trim().min(1, 'Industry is required').max(150),
  workforceCount: z.number().int().min(0).max(100000).optional(),
  skills: z.string().trim().max(500).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  message: z.string().trim().max(2000).optional(),
});
export type CreateContractorRequestInput = z.infer<typeof createContractorRequestSchema>;

// Field Staff / Ops Head only. Kept as a flat status update — no separate
// transition rules, per "keep it simple" (this is a lead queue, not the
// enquiry brokerage lifecycle).
export const updateContractorRequestStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'PROFILE_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED']),
  staffNotes: z.string().trim().max(2000).optional(),
});
export type UpdateContractorRequestStatusInput = z.infer<typeof updateContractorRequestStatusSchema>;
