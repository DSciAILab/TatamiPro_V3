import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { initDatabase } from './database/sqlite';
import { eventsRouter } from './routes/events';
import { athletesRouter } from './routes/athletes';
import { staffRouter } from './routes/staff';
import { setupWebSocket } from './websocket/handler';
import { SyncService } from './sync/supabase-sync';

const app = express();
const httpServer = createServer(app);

// Socket.io for real-time updates
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'local',
    timestamp: new Date().toISOString() 
  });
});

// API Routes
app.use('/api/events', eventsRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/staff', staffRouter);

// Initialize database
initDatabase();

// Setup WebSocket handlers
setupWebSocket(io);

// Initialize sync service
const syncService = new SyncService();
syncService.startBackgroundSync();

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Local server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for real-time updates`);
  console.log(`💾 SQLite database initialized`);
});

// Export io for use in routes
export { io };
