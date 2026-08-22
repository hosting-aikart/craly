import { z } from 'zod';

// Contractors no longer self-register (Phase 1: internal staff manage
// contractor_profiles directly — see docs/open-decisions.md). Only
// 'business' remains a public signup path.
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['business']),
  companyName: z.string().min(1, 'Company name is required'),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
