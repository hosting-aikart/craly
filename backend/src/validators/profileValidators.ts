import { z } from 'zod';

export const contractorProfileSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  yearsExperience: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).pipe(z.number().int().min(0).max(100)).optional(),
  workforceSize: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).pipe(z.number().int().min(0).max(100000)).optional(),
  industry: z.string().max(150).optional(),
  skills: z.union([
    z.array(z.string()),
    z.string().transform((str) => str.split(',').map((s) => s.trim()).filter(Boolean)),
  ]).optional(),
  serviceAreas: z.union([
    z.array(z.string()),
    z.string().transform((str) => str.split(',').map((s) => s.trim()).filter(Boolean)),
  ]).optional(),
  availability: z.enum(['AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED']).optional(),
  categoryIds: z.array(z.number().int()).optional(),
});
export type ContractorProfileInput = z.infer<typeof contractorProfileSchema>;

export const businessProfileSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  industry: z.string().max(150).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
