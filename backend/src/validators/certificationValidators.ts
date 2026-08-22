import { z } from 'zod';

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createAssessmentSchema = z.object({
  assessmentType: z.enum(['in_person', 'remote']),
  assessmentDate: isoDate,
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().trim().max(2000).optional(),
  evidenceDocumentIds: z.array(z.string().uuid()).optional(),
});
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const revokeCertificationSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to revoke certification').max(1000),
});
export type RevokeCertificationInput = z.infer<typeof revokeCertificationSchema>;
