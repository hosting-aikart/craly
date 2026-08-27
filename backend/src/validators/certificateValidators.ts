import { z } from 'zod';

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// Generic license/certificate model (§12) — certificateType/industry are
// free text so any future trade credential (electrical license, SSPC/NACE,
// refractory/furnace, ...) fits without a schema change.
export const createCertificateSchema = z.object({
  certificateType: z.string().trim().min(1).max(150),
  industry: z.string().trim().max(150).optional(),
  documentId: z.string().uuid().optional(),
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;

export const updateCertificateSchema = z.object({
  status: z.enum(['active', 'expired', 'revoked']).optional(),
  notes: z.string().trim().max(1000).optional(),
  expiryDate: isoDate.optional(),
});
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
