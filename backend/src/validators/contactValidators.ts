import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(5000),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;
