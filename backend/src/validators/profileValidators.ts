import { z } from 'zod';

export const contractorProfileSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  workforceSize: z.number().int().min(0).max(100000).optional(),
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
