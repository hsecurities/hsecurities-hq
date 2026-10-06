import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'hSecCyberSchoolSuperSecretKey2026!';
const PROXIMITY_THRESHOLD = 180; // Distance in pixels for spatial voice & video activation

interface PlayerState {
  socketId: string;
  userId: string;
  name: string;
  roleName: string;
  rolePriority: number;
  avatarConfig: any;
  roomId: string;
  x: number;
  y: number;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
}

// In-memory active players map: socketId -> PlayerState
const activePlayers = new Map<string, PlayerState>();

export const initCampusSocket = (io: Server) => {
  // Middleware: Authenticate socket with JWT
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as { userId: string };

      const userRes = await query(
        `SELECT u.id, u.name, u.avatar_config, r.name as role_name, r.priority as role_priority
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1 AND u.status = 'active'`,
        [decoded.userId]
      );

      if (userRes.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.data.user = userRes.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    console.log(`[Socket Connected] User ${user.name} (${user.id}) - Socket ${socket.id}`);

    // 1. JOIN ROOM & INITIALIZE PLAYER STATE
    socket.on('player:join_room', async ({ roomId, x, y }) => {
      // Leave previous room if any
      const previousState = activePlayers.get(socket.id);
      if (previousState && previousState.roomId !== roomId) {
        socket.leave(previousState.roomId);
        io.to(previousState.roomId).emit('player:left', { socketId: socket.id, userId: user.id });
      }

      socket.join(roomId);

      const player: PlayerState = {
        socketId: socket.id,
        userId: user.id,
        name: user.name,
        roleName: user.role_name,
        rolePriority: user.role_priority,
        avatarConfig: user.avatar_config,
        roomId: roomId || 'reception',
        x: x || 1600,
        y: y || 2016,
        isMicOn: false,
        isCamOn: false,
        isScreenSharing: false
      };

      activePlayers.set(socket.id, player);

      // Log session in DB
      try {
        await query(
          `INSERT INTO sessions (user_id, room_id, socket_id, x_pos, y_pos)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, player.roomId, socket.id, player.x, player.y]
        );
      } catch (e) {
        console.error('[Session Log Error]', e);
      }

      // Send existing players in this room to the joining player
      const roomPlayers: PlayerState[] = [];
      for (const [sId, p] of activePlayers.entries()) {
        if (p.roomId === player.roomId && sId !== socket.id) {
          roomPlayers.push(p);
        }
      }
      socket.emit('room:current_players', { players: roomPlayers });

      // Notify others in this room that a new player arrived
      socket.to(player.roomId).emit('player:joined', { player });
    });

    // 2. PLAYER MOVEMENT & PROXIMITY COMPUTATION
    socket.on('player:move', ({ x, y }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      player.x = x;
      player.y = y;

      // Broadcast position to everyone in the room
      socket.to(player.roomId).emit('player:moved', {
        socketId: socket.id,
        x,
        y
      });

      // Calculate spatial proximity for WebRTC voice/video
      const nearbySockets: string[] = [];
      for (const [sId, other] of activePlayers.entries()) {
        if (sId !== socket.id && other.roomId === player.roomId) {
          const dx = player.x - other.x;
          const dy = player.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= PROXIMITY_THRESHOLD) {
            nearbySockets.push(sId);
          }
        }
      }

      // Notify this player of who is close enough for spatial audio
      socket.emit('proximity:nearby_players', { nearbySockets });
    });

    // 3. WEBRTC SIGNALING (Mesh / Peer-to-Peer)
    socket.on('webrtc:signal', ({ toSocketId, signalData }) => {
      io.to(toSocketId).emit('webrtc:signal', {
        fromSocketId: socket.id,
        signalData
      });
    });

    // 4. MEDIA STATUS UPDATES (Mic / Cam / Screen Sharing)
    socket.on('player:media_state', ({ isMicOn, isCamOn, isScreenSharing }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      player.isMicOn = isMicOn;
      player.isCamOn = isCamOn;
      player.isScreenSharing = isScreenSharing;

      io.to(player.roomId).emit('player:media_updated', {
        socketId: socket.id,
        isMicOn,
        isCamOn,
        isScreenSharing
      });
    });

    // 5. CHAT MESSAGING
    socket.on('chat:send_message', ({ message, isPrivate, targetSocketId }) => {
      const player = activePlayers.get(socket.id);
      if (!player) return;

      const chatPayload = {
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role_name,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      if (isPrivate && targetSocketId) {
        // Direct private message
        io.to(targetSocketId).emit('chat:private_message', chatPayload);
        socket.emit('chat:private_message', chatPayload);
      } else {
        // Room-wide public chat
        io.to(player.roomId).emit('chat:room_message', chatPayload);
      }
    });

    // 6. ADMIN CAMPUS BROADCAST MESSAGE
    socket.on('admin:broadcast', ({ message, priority }) => {
      if (user.role_priority >= 3) { // Trainer or Admin
        io.emit('campus:broadcast', {
          authorName: user.name,
          authorRole: user.role_name,
          message,
          priority: priority || 'normal',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 7. DISCONNECT & CLEANUP
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] ${user.name} (${socket.id})`);
      const player = activePlayers.get(socket.id);

      if (player) {
        activePlayers.delete(socket.id);
        io.to(player.roomId).emit('player:left', { socketId: socket.id, userId: user.id });

        // Update session in DB
        try {
          await query(
            `UPDATE sessions
             SET left_at = NOW(),
                 duration_seconds = EXTRACT(EPOCH FROM (NOW() - joined_at))
             WHERE socket_id = $1 AND left_at IS NULL`,
            [socket.id]
          );
        } catch (e) {
          console.error('[Session Close Error]', e);
        }
      }
    });
  });
};
