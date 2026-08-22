import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import { contractorProfileSchema, businessProfileSchema } from '../validators/profileValidators';
import { sanitizeContactInfo } from '../utils/contactSanitizer';
import type { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/profile/me
 * Requires requireAuth. Returns the caller's role-specific profile row —
 * used by the frontend to decide login → onboarding vs. login → dashboard.
 */
export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, role } = req.user!;

    if (role === 'contractor') {
      const [profile] = await sql`
        SELECT id, company_name, description, city, state, years_experience,
               workforce_size, verification_status, verification_note,
               onboarding_complete
        FROM contractor_profiles WHERE user_id = ${userId}
      `;
      if (!profile) {
        const err: AppError = new Error('Profile not found');
        err.statusCode = 404;
        return next(err);
      }
      const categories = await sql`
        SELECT sc.id, sc.name, sc.slug
        FROM contractor_categories cc
        JOIN service_categories sc ON sc.id = cc.category_id
        WHERE cc.contractor_id = ${profile.id}
      `;
      res.json({ data: { role, ...profile, categories } });
      return;
    }

    if (role === 'business') {
      const [profile] = await sql`
        SELECT id, company_name, industry, city, state, onboarding_complete
        FROM business_profiles WHERE user_id = ${userId}
      `;
      if (!profile) {
        const err: AppError = new Error('Profile not found');
        err.statusCode = 404;
        return next(err);
      }
      res.json({ data: { role, ...profile } });
      return;
    }

    if (role === 'admin') {
      res.json({ data: { role: 'admin', id: userId, company_name: 'Craly Admin', onboarding_complete: true } });
      return;
    }

    // Field Staff / Ops Head have no company profile — the Profile page
    // just shows their internal account info (spec §1 "Profile" section).
    if (role === 'field_staff' || role === 'ops_head') {
      const [account] = await sql`SELECT id, email, created_at FROM users WHERE id = ${userId}`;
      if (!account) {
        const err: AppError = new Error('Account not found');
        err.statusCode = 404;
        return next(err);
      }
      res.json({ data: { role, id: account.id, email: account.email, created_at: account.created_at, onboarding_complete: true } });
      return;
    }

    const err: AppError = new Error('Invalid user role');
    err.statusCode = 400;
    next(err);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/profile/me
 * Requires requireAuth. Updates the caller's role-specific profile and
 * marks onboarding_complete = true.
 */
export async function updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub: userId, role } = req.user!;

    if (role === 'contractor') {
      const parsed = contractorProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
        err.statusCode = 400;
        return next(err);
      }
      const { companyName, description, city, state, yearsExperience, workforceSize, categoryIds } =
        parsed.data;

      const cleanDesc = description ? sanitizeContactInfo(description) : null;

      const profile = await sql.begin(async (tx) => {
        const [updated] = await tx`
          UPDATE contractor_profiles SET
            company_name = COALESCE(${companyName ?? null}, company_name),
            description = COALESCE(${cleanDesc}, description),
            city = COALESCE(${city ?? null}, city),
            state = COALESCE(${state ?? null}, state),
            years_experience = COALESCE(${yearsExperience ?? null}, years_experience),
            workforce_size = COALESCE(${workforceSize ?? null}, workforce_size),
            onboarding_complete = true,
            updated_at = now()
          WHERE user_id = ${userId}
          RETURNING id
        `;

        if (!updated) {
          const err: AppError = new Error('Profile not found');
          err.statusCode = 404;
          throw err;
        }

        if (categoryIds) {
          await tx`DELETE FROM contractor_categories WHERE contractor_id = ${updated.id}`;
          for (const categoryId of categoryIds) {
            await tx`
              INSERT INTO contractor_categories (contractor_id, category_id)
              VALUES (${updated.id}, ${categoryId})
              ON CONFLICT DO NOTHING
            `;
          }
        }

        return updated;
      });

      res.json({ data: { id: profile.id } });
      return;
    }

    if (role === 'business') {
      const parsed = businessProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
        err.statusCode = 400;
        return next(err);
      }
      const { companyName, industry, city, state } = parsed.data;

      const [updated] = await sql`
        UPDATE business_profiles SET
          company_name = COALESCE(${companyName ?? null}, company_name),
          industry = COALESCE(${industry ?? null}, industry),
          city = COALESCE(${city ?? null}, city),
          state = COALESCE(${state ?? null}, state),
          onboarding_complete = true,
          updated_at = now()
        WHERE user_id = ${userId}
        RETURNING id
      `;

      if (!updated) {
        const err: AppError = new Error('Profile not found');
        err.statusCode = 404;
        return next(err);
      }

      res.json({ data: { id: updated.id } });
      return;
    }

    if (role === 'field_staff' || role === 'ops_head') {
      const err: AppError = new Error('Staff profile fields are not editable in Phase 1');
      err.statusCode = 400;
      return next(err);
    }

    const err: AppError = new Error('Admins do not have a profile');
    err.statusCode = 400;
    next(err);
  } catch (err) {
    next(err);
  }
}
