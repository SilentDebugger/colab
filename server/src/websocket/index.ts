import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@devdock/shared';
import type { LogManager } from '../services/log-manager.js';

export function setupWebSocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  logManager: LogManager
): void {
  io.on('connection', (socket) => {
    console.log(`📡 Client connected: ${socket.id}`);

    socket.on('logs:subscribe', (projectId: string) => {
      socket.join(`logs:${projectId}`);
      // Send buffered logs
      const logs = logManager.getBuffer(projectId);
      for (const entry of logs) {
        socket.emit('project:log', entry);
      }
    });

    socket.on('logs:unsubscribe', (projectId: string) => {
      socket.leave(`logs:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`📡 Client disconnected: ${socket.id}`);
    });
  });
}
