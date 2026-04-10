import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

import { initWhatsApp } from './whatsapp.js';
import { registerRoutes } from './routes/index.js';
import { rateLimitMiddleware } from './middlewares/rateLimit.middleware.js';

// ── Express + HTTP server ─────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[ws] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[ws] Client disconnected: ${socket.id}`);
  });
});

// ── Global middleware ─────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimitMiddleware);

// Make io available to request handlers if needed
app.set('io', io);

// ── Routes ────────────────────────────────────────────────────────────────────

registerRoutes(app);

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);

httpServer.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  console.log(`[server] API key protection: ${process.env.API_KEY ? 'enabled' : 'DISABLED (set API_KEY)'}`);

  // Initialise Baileys WhatsApp connection
  initWhatsApp(io).catch((err) => {
    console.error('[server] Failed to init WhatsApp:', err);
  });
});
