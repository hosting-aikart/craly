import { z } from 'zod';

// Generic, extensible document categories — extending this list never needs
// a migration (contractor_documents.document_type has no DB check
// constraint, by design; see the migration's comment).
export const DOCUMENT_TYPES = [
  'gst',
  'pan',
  'aadhaar',
  'labor_license',
  'msme',
  'pf_registration',
  'esic_registration',
  'business_registration',
  'industry_license',
  'safety_certification',
  'compliance_certificate',
  'compliance_report',
  'other_certificate',
  'verification_evidence',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Aadhaar/PAN are the identity documents Field Staff must never view or
// download once uploaded — enforced in documentController.ts, not just here.
export const SENSITIVE_DOCUMENT_TYPES: DocumentType[] = ['aadhaar', 'pan'];

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const uploadDocumentSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional(),
  certificationAssessmentId: z.string().uuid().optional(),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const reviewDocumentSchema = z
  .object({
    decision: z.enum(['approved', 'rejected', 'replacement_requested']),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision !== 'approved' && !val.note) {
      ctx.addIssue({ code: 'custom', message: 'A note is required when rejecting or requesting replacement', path: ['note'] });
    }
  });
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;
