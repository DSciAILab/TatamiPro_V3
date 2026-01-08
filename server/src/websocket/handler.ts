import { Server as SocketServer, Socket } from 'socket.io';

export function setupWebSocket(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`📱 Client connected: ${socket.id}`);
    
    // Join event room for targeted updates
    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      console.log(`Client ${socket.id} joined event:${eventId}`);
    });
    
    // Leave event room
    socket.on('leave:event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
      console.log(`Client ${socket.id} left event:${eventId}`);
    });
    
    // Handle fight result updates (real-time for judge tablets)
    socket.on('fight:result', (data: { eventId: string, matchId: string, result: any }) => {
      // Broadcast to all clients watching this event
      io.to(`event:${data.eventId}`).emit('fight:result:updated', data);
      console.log(`Fight result updated: ${data.matchId}`);
    });
    
    // Handle check-in updates
    socket.on('checkin:update', (data: { eventId: string, athleteId: string, status: string }) => {
      io.to(`event:${data.eventId}`).emit('checkin:updated', data);
    });
    
    // Handle attendance updates
    socket.on('attendance:update', (data: { eventId: string, athleteId: string, status: string }) => {
      io.to(`event:${data.eventId}`).emit('attendance:updated', data);
    });
    
    // Handle bracket updates
    socket.on('bracket:update', (data: { eventId: string, divisionId: string, bracket: any }) => {
      io.to(`event:${data.eventId}`).emit('bracket:updated', data);
    });
    
    // Sync request from client
    socket.on('sync:request', () => {
      socket.emit('sync:status', { 
        lastSync: new Date().toISOString(),
        pendingChanges: 0 // TODO: count from sync_queue
      });
    });
    
    socket.on('disconnect', () => {
      console.log(`📴 Client disconnected: ${socket.id}`);
    });
  });
  
  console.log('🔌 WebSocket handlers initialized');
}
