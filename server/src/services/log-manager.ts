import { v4 as uuid } from 'uuid';
import type { Server } from 'socket.io';
import type { LogEntry, LogStream, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';

export class LogManager {
  private buffers: Map<string, LogEntry[]> = new Map();
  private maxSize: number;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(maxSize: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.maxSize = maxSize;
    this.io = io;
  }

  append(projectId: string, stream: LogStream, text: string): void {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.length === 0) continue;
      const entry: LogEntry = {
        id: uuid(),
        timestamp: Date.now(),
        projectId,
        stream,
        text: line,
      };

      let buffer = this.buffers.get(projectId);
      if (!buffer) {
        buffer = [];
        this.buffers.set(projectId, buffer);
      }
      buffer.push(entry);
      if (buffer.length > this.maxSize) {
        buffer.shift();
      }

      // Emit to subscribers in the project's room
      this.io.to(`logs:${projectId}`).emit('project:log', entry);
    }
  }

  getBuffer(projectId: string): LogEntry[] {
    return this.buffers.get(projectId) || [];
  }

  clear(projectId: string): void {
    this.buffers.delete(projectId);
  }

  clearAll(): void {
    this.buffers.clear();
  }
}
