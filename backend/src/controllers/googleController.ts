import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import sql from '../db/index';
import config from '../config/index';
import type { AppError } from '../middlewares/errorHandler';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

/**
 * GET /api/google/calendar/connect
 * Generates Google OAuth consent URL.
 */
export async function connectGoogleCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;

    if (!config.googleClientId || !config.googleClientSecret) {
      const err: AppError = new Error('Google OAuth credentials are not configured on the server');
      err.statusCode = 400;
      return next(err);
    }

    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
      state: userId,
    });

    res.json({ data: { authUrl } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/google/calendar/callback
 * Redirect handler from Google OAuth. Exchanges code for tokens & saves refresh_token.
 */
export async function googleCalendarCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state: userId } = req.query;

    if (!code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
      res.redirect(`${config.frontendUrl}?error=google_auth_failed`);
      return;
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      res.redirect(`${config.frontendUrl}?error=no_tokens_received`);
      return;
    }

    await sql`
      INSERT INTO user_google_tokens (user_id, access_token, refresh_token, expiry_date, updated_at)
      VALUES (
        ${userId},
        ${tokens.access_token ?? null},
        ${tokens.refresh_token ?? ''},
        ${tokens.expiry_date ?? null},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = CASE WHEN EXCLUDED.refresh_token <> '' THEN EXCLUDED.refresh_token ELSE user_google_tokens.refresh_token END,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = now()
    `;

    // Redirect back to frontend
    res.redirect(`${config.frontendUrl}?google_calendar=connected`);
  } catch (err) {
    console.error('[google-auth] callback error:', err);
    res.redirect(`${config.frontendUrl}?error=google_auth_exception`);
  }
}

/**
 * GET /api/google/calendar/status
 * Returns whether caller has connected their Google Calendar.
 */
export async function getGoogleCalendarStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;

    const [row] = await sql`
      SELECT user_id, refresh_token FROM user_google_tokens WHERE user_id = ${userId}
    `;

    const isConnected = Boolean(row && row.refresh_token && row.refresh_token.length > 0);
    res.json({ data: { isConnected } });
  } catch (err) {
    next(err);
  }
}
