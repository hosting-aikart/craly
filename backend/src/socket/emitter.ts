import { getIO } from './index';

/**
 * Emits a Socket.IO event to a specific user (all their connected tabs/devices).
 */
export function emitToUser(userId: string, event: string, payload: any): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    console.error(`[socket] Failed to emit ${event} to user ${userId}:`, err);
  }
}

/**
 * Emits a Socket.IO event to all connected sockets in an enquiry room.
 */
export function emitToEnquiryRoom(enquiryId: string, event: string, payload: any): void {
  try {
    const io = getIO();
    io.to(`enquiry:${enquiryId}`).emit(event, payload);
  } catch (err) {
    console.error(`[socket] Failed to emit ${event} to room enquiry:${enquiryId}:`, err);
  }
}
