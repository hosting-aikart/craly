import { z } from 'zod';

export const createEnquirySchema = z.object({
  contractorId: z.string().uuid('Invalid contractor'),
  categoryId: z.number().int().positive().optional(),
  location: z.string().trim().min(1).max(200).optional(),
  workersRequired: z.number().int().positive().max(100000).optional(),
  startDate: z.string().date().optional(), // 'YYYY-MM-DD'
  duration: z.string().trim().min(1).max(100).optional(),
  message: z.string().trim().min(1, 'Please describe your requirement').max(3000),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

// Only a party to the enquiry can explicitly close it — every other
// transition (viewed/responded/in_discussion) is server-managed based on
// who opens the enquiry and who sends messages, so it can't be spoofed.
export const updateEnquiryStatusSchema = z.object({
  status: z.literal('closed'),
});
export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusSchema>;

export const createMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
