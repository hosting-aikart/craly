import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import config from '../config/index';
import { verifyAuthToken, AuthTokenPayload } from '../utils/jwt';
import { AUTH_COOKIE_NAME } from '../middlewares/auth';
import sql from '../db/index';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      userId: string;
      role: 'contractor' | 'business' | 'admin';
    };
  };
}

let ioServer: Server | null = null;
const userSocketsMap = new Map<string, Set<string>>();

export function initSocketServer(httpServer: HttpServer): Server {
  ioServer = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.trim().replace(/\/$/, '');

        if (config.allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        if (cleanOrigin.endsWith('craly.co') || cleanOrigin.endsWith('.craly.co')) {
          return callback(null, true);
        }

        const isAllowed = config.allowedOrigins.some((allowed) => {
          const cleanAllowed = allowed.trim().replace(/\/$/, '');
          if (!cleanAllowed) return false;
          if (cleanAllowed === '*') return true;
          if (cleanOrigin === cleanAllowed) return true;
          if (cleanAllowed.includes('vercel.app') && cleanOrigin.endsWith('.vercel.app')) return true;
          return false;
        });

        callback(null, isAllowed);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // JWT Authentication Middleware for Socket.IO
  ioServer.use(async (socket: Socket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies[AUTH_COOKIE_NAME];
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyAuthToken(token) as AuthTokenPayload;
      if (!decoded || !decoded.sub) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.user = {
        userId: decoded.sub,
        role: decoded.role,
      };

      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  ioServer.on('connection', (socket: AuthenticatedSocket) => {
    const { userId } = socket.data.user;

    // Track user socket IDs for targeted notifications
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId)!.add(socket.id);

    // Automatically join the user's personal channel
    socket.join(`user:${userId}`);

    // Join Enquiry Room (strictly validated)
    socket.on('join_enquiry_room', async ({ enquiryId }: { enquiryId: string }) => {
      try {
        if (!enquiryId || typeof enquiryId !== 'string') return;

        const [enquiry] = await sql`
          SELECT i.id, bp.user_id AS business_user_id, cp.user_id AS contractor_user_id
          FROM inquiries i
          JOIN business_profiles bp ON bp.id = i.business_id
          JOIN contractor_profiles cp ON cp.id = i.contractor_id
          WHERE i.id = ${enquiryId}
        `;

        if (!enquiry) {
          socket.emit('error', { message: 'Enquiry not found' });
          return;
        }

        const isParticipant =
          enquiry.business_user_id === userId || enquiry.contractor_user_id === userId;

        if (!isParticipant) {
          socket.emit('error', { message: 'Unauthorized room access' });
          return;
        }

        const roomName = `enquiry:${enquiryId}`;
        socket.join(roomName);
        socket.emit('room_joined', { room: roomName, enquiryId });
      } catch (err) {
        console.error('[socket] error joining room:', err);
      }
    });

    socket.on('leave_enquiry_room', ({ enquiryId }: { enquiryId: string }) => {
      if (enquiryId) {
        socket.leave(`enquiry:${enquiryId}`);
      }
    });

    socket.on('disconnect', () => {
      const userSockets = userSocketsMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(userId);
        }
      }
    });
  });

  console.log('[socket] Socket.IO server initialized');
  return ioServer;
}

export function getIO(): Server {
  if (!ioServer) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return ioServer;
}
