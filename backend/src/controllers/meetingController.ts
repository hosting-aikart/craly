import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import sql from '../db/index';
import { getOAuth2Client } from './googleController';
import { createNotification } from '../utils/notifications';
import { emitToUser, emitToEnquiryRoom } from '../socket/emitter';
import type { AppError } from '../middlewares/errorHandler';

function forbidden(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 403;
  return err;
}
function notFound(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 404;
  return err;
}

/**
 * POST /api/enquiries/:id/meetings
 * Schedules a Google Meet meeting via Google Calendar API with automatically generated conference link.
 */
export async function createMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: enquiryId } = req.params;
    const userId = req.user!.sub;
    const { title, scheduledStart, durationMinutes = 30 } = req.body;

    if (!title || !scheduledStart) {
      const err: AppError = new Error('Title and scheduled start time are required');
      err.statusCode = 400;
      return next(err);
    }

    const [enquiry] = await sql`
      SELECT i.id, i.status,
             bp.user_id AS business_user_id, bp.company_name AS business_name, u_b.email AS business_email,
             cp.user_id AS contractor_user_id, cp.company_name AS contractor_name, u_c.email AS contractor_email
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN users u_b ON u_b.id = bp.user_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      JOIN users u_c ON u_c.id = cp.user_id
      WHERE i.id = ${enquiryId}
    `;

    if (!enquiry) return next(notFound('Enquiry not found'));

    const isBusiness = enquiry.business_user_id === userId;
    const isContractor = enquiry.contractor_user_id === userId;
    if (!isBusiness && !isContractor) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    if (enquiry.status !== 'ACCEPTED') {
      const err: AppError = new Error('Meetings can only be scheduled after contractor accepts the enquiry');
      err.statusCode = 400;
      return next(err);
    }

    // Retrieve creator's Google OAuth refresh token
    const [googleToken] = await sql`
      SELECT refresh_token, access_token FROM user_google_tokens WHERE user_id = ${userId}
    `;

    if (!googleToken || !googleToken.refresh_token) {
      const err: AppError = new Error('Please connect your Google Calendar before scheduling a Google Meet');
      err.statusCode = 400;
      return next(err);
    }

    const startDate = new Date(scheduledStart);
    const duration = parseInt(String(durationMinutes), 10) || 30;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    // Initialize Google OAuth2 client with user's refresh token
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: googleToken.refresh_token,
      access_token: googleToken.access_token ?? undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const requestId = crypto.randomUUID();

    // Create Calendar Event with automatically generated Google Meet conference link
    const eventResponse = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `Craly Project Discussion: ${title}`,
        description: `Project discussion for Craly enquiry #${enquiryId}.\n\nParticipants:\n- ${enquiry.business_name}\n- ${enquiry.contractor_name}`,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        attendees: [
          { email: enquiry.business_email },
          { email: enquiry.contractor_email },
        ],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const googleEventId = eventResponse.data.id ?? null;
    const googleMeetUrl =
      eventResponse.data.hangoutLink ??
      eventResponse.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ??
      null;

    // Save meeting record in PostgreSQL
    const [savedMeeting] = await sql`
      INSERT INTO meetings (
        enquiry_id, created_by, title, scheduled_start, scheduled_end,
        google_event_id, google_meet_url, status
      ) VALUES (
        ${enquiryId}, ${userId}, ${title}, ${startDate.toISOString()}, ${endDate.toISOString()},
        ${googleEventId}, ${googleMeetUrl}, 'SCHEDULED'
      )
      RETURNING *
    `;

    // Post a system message in the conversation thread
    const formattedDate = startDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = startDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const receiverId = isContractor ? enquiry.business_user_id : enquiry.contractor_user_id;
    const creatorName = isContractor ? enquiry.contractor_name : enquiry.business_name;
    const systemText = `📅 Google Meet Scheduled by ${creatorName}: "${title}" on ${formattedDate} at ${formattedTime}.${googleMeetUrl ? ` Link: ${googleMeetUrl}` : ''}`;

    const [savedMessage] = await sql`
      INSERT INTO inquiry_messages (inquiry_id, sender_id, receiver_id, message)
      VALUES (${enquiryId}, ${userId}, ${receiverId}, ${systemText})
      RETURNING *
    `;

    // Realtime notifications
    const notifTitle = 'Google Meet Scheduled';
    const notifMessage = `${creatorName} scheduled a Google Meet for ${formattedDate} at ${formattedTime}.`;

    await createNotification({
      userId: receiverId,
      type: 'MEETING_CREATED',
      title: notifTitle,
      message: notifMessage,
      referenceId: enquiryId,
    });

    emitToEnquiryRoom(enquiryId, 'meeting:created', savedMeeting);
    emitToEnquiryRoom(enquiryId, 'message:new', savedMessage);
    emitToUser(receiverId, 'notification:new', {
      title: notifTitle,
      message: notifMessage,
      referenceId: enquiryId,
    });

    res.status(201).json({ data: savedMeeting });
  } catch (err) {
    console.error('[meeting] createMeeting error:', err);
    next(err);
  }
}

/**
 * GET /api/enquiries/:id/meetings
 * Lists all meetings scheduled for an enquiry.
 */
export async function listMeetings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: enquiryId } = req.params;
    const userId = req.user!.sub;

    const [enquiry] = await sql`
      SELECT i.id, bp.user_id AS business_user_id, cp.user_id AS contractor_user_id
      FROM inquiries i
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      WHERE i.id = ${enquiryId}
    `;

    if (!enquiry) return next(notFound('Enquiry not found'));

    if (enquiry.business_user_id !== userId && enquiry.contractor_user_id !== userId) {
      return next(forbidden('You do not have access to this enquiry'));
    }

    const rows = await sql`
      SELECT * FROM meetings WHERE enquiry_id = ${enquiryId} ORDER BY scheduled_start ASC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/meetings
 * Lists all meetings for the authenticated user across all enquiries.
 */
export async function listUserMeetings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;

    const rows = await sql`
      SELECT m.*,
             i.status AS enquiry_status,
             bp.company_name AS business_name,
             cp.company_name AS contractor_name,
             sc.name AS category_name,
             CASE
               WHEN bp.user_id = ${userId} THEN cp.company_name
               ELSE bp.company_name
             END AS other_party_name
      FROM meetings m
      JOIN inquiries i ON i.id = m.enquiry_id
      JOIN business_profiles bp ON bp.id = i.business_id
      JOIN contractor_profiles cp ON cp.id = i.contractor_id
      LEFT JOIN service_categories sc ON sc.id = i.category_id
      WHERE bp.user_id = ${userId} OR cp.user_id = ${userId}
      ORDER BY m.scheduled_start DESC
    `;

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}
