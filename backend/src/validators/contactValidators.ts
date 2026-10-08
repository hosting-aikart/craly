import { z } from 'zod';
import { optionalPhoneSchema } from './phoneValidator';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  company: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(5000),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;
