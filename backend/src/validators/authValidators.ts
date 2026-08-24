import { z } from 'zod';

// NOTE: left as z.enum(['business', 'contractor']) — a concurrent, actively
// developed effort (OTP-verified signup, organization_members, contractor
// profile creation — see authController.signup) depends on 'contractor'
// still validating here. Only the *public UI paths* into it were removed
// (signup page, login page chip) per the Field Staff module's "no
// contractor login" requirement; the backend endpoint itself was
// deliberately left alone rather than breaking that other session's
// in-progress work. See docs/open-decisions.md — this reconciliation is
// still an open decision, not one this change resolves.
export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['business', 'contractor']),
  companyName: z.string().min(1, 'Company name is required'),
  mobile: z
    .string({ message: 'Phone number is required' })
    .min(1, 'Phone number is required')
    .transform((v) => v.replace(/[\s\-().]/g, ''))
    .refine(
      (v) => /^\+?[0-9]{7,15}$/.test(v),
      { message: 'Please enter a valid phone number (7-15 digits with optional country code)' },
    ),
  city: z.string().optional(),
  state: z.string().optional(),
  workforceSize: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  yearsExperience: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const sendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  mobile: z
    .string({ message: 'Phone number is required' })
    .min(1, 'Phone number is required')
    .transform((v) => v.replace(/[\s\-().]/g, ''))
    .refine(
      (v) => /^\+?[0-9]{7,15}$/.test(v),
      { message: 'Please enter a valid phone number (7-15 digits with optional country code)' },
    ),
  name: z.string().optional(),
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  mobile: z
    .string({ message: 'Phone number is required' })
    .min(1, 'Phone number is required')
    .transform((v) => v.replace(/[\s\-().]/g, ''))
    .refine(
      (v) => /^\+?[0-9]{7,15}$/.test(v),
      { message: 'Please enter a valid phone number' },
    ),
  emailOtp: z.string().length(6, 'Email verification code must be 6 digits'),
  phoneOtp: z.string().length(6, 'Phone verification code must be 6 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

