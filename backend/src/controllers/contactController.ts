import { Request, Response, NextFunction } from 'express';
import { contactFormSchema } from '../validators/contactValidators';
import { sendContactNotification } from '../utils/mailer';
import type { AppError } from '../middlewares/errorHandler';

/**
 * POST /api/contact
 * Used by both the footer's ContactModal and the landing page's inline
 * ContactSection — sends a notification email to config.contactEmailTo.
 */
export async function submitContactForm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }

    await sendContactNotification(parsed.data);

    res.status(201).json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}
