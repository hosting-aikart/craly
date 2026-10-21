import { z } from 'zod';
import { phoneSchema } from './phoneValidator';

import { optionalCountryStateSchema } from './geoAndSkillsValidators';
import { optionalContractorClassSchema } from './contractorClassValidator';

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
  mobile: phoneSchema,
  city: z.string().optional(),
  country: z.string().optional(),
  state: optionalCountryStateSchema,
  workforceSize: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  yearsExperience: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]).optional(),
  contractorClass: optionalContractorClassSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

// Email-only signup verification. Phone number is still collected on the
// signup form (see signupSchema.mobile) and stored on the profile, but is
// NOT verified as part of signup — SMS/MSG91 is intentionally out of the
// active auth flow (see utils/sms.ts, kept intact but unused, so phone
// verification can be reintroduced later without rebuilding it).
export const sendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  emailOtp: z.string().length(4, 'Email verification code must be 4 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().length(6, 'Reset code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

