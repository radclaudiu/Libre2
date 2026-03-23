import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../utils/config';
import { JwtPayload } from '../../middleware/auth';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(',').map(s => s.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authenticated namespace for TPV/admin
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    // Allow unauthenticated connections for public clients (they only listen)
    if (!token) {
      socket.data.isPublic = true;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data.user = decoded;
      socket.data.isPublic = false;
      next();
    } catch {
      // Allow connection but mark as public
      socket.data.isPublic = true;
      next();
    }
  });

  io.on('connection', (socket) => {
    if (!socket.data.isPublic && socket.data.user) {
      const user = socket.data.user as JwtPayload;
      const room = `company_${user.companyId}`;
      socket.join(room);
      console.log(`TPV/Admin connected: ${socket.id} joined ${room}`);
    }

    // Public clients can join table-specific rooms to listen for session events
    socket.on('join_table', (tableId: string) => {
      if (typeof tableId === 'string' && tableId.length < 100) {
        socket.join(`table_${tableId}`);
        console.log(`Public client ${socket.id} joined table_${tableId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Helper to emit session events to both company room and table-specific room
export function emitSessionEvent(
  event: string,
  companyId: string,
  tableId: string,
  data: Record<string, unknown>
) {
  if (!io) return;
  io.to(`company_${companyId}`).emit(event, data);
  io.to(`table_${tableId}`).emit(event, data);
}
