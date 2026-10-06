import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { initCampusSocket } from './sockets/campusSocket';

import authRoutes from './routes/auth.routes';
import roomsRoutes from './routes/rooms.routes';
import ctfRoutes from './routes/ctf.routes';
import eventsRoutes from './routes/events.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// CORS configuration for REST & WebSockets
const allowedOrigins = [CLIENT_URL, 'https://office.hsecurities.in', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all during development & proxying
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO Server Setup with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Initialize Socket.IO Multiplayer & WebRTC Engine
initCampusSocket(io);

// Health Check API Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'hSECURITIES HQ Virtual Campus',
    domain: 'office.hsecurities.in',
    timestamp: new Date().toISOString()
  });
});

// REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/ctf', ctfRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin', adminRoutes);

// Fallback error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[Unhandled Express Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️  hSECURITIES HQ Virtual Campus Server Online`);
  console.log(`📡 Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Target Domain: office.hsecurities.in`);
  console.log(`====================================================`);
});

export default app;
