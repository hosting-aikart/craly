import { z } from 'zod';

export const sendVerificationMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
});
export type SendVerificationMessageInput = z.infer<typeof sendVerificationMessageSchema>;
