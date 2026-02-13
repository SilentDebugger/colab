import fs from 'fs';
import type { Server } from 'socket.io';
import type { ResourceUsage, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';
import type { ProcessManager } from './process-manager.js';

interface CpuSnapshot {
  utime: number;
  stime: number;
  timestamp: number;
}

export class ResourceMonitor {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private processManager: ProcessManager;
  private interval: ReturnType<typeof setInterval> | null = null;
  private cpuSnapshots: Map<number, CpuSnapshot> = new Map();
  private clockTicks: number = 100; // Default, usually 100 on Linux

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, processManager: ProcessManager) {
    this.io = io;
    this.processManager = processManager;
  }

  start(intervalMs: number): void {
    this.interval = setInterval(() => this.collectAll(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async collectAll(): Promise<void> {
    const running = this.processManager.getRunningProjects();

    for (const [projectId, managed] of running) {
      const pid = managed.process.pid;
      if (!pid) continue;

      try {
        const usage = this.getResourceUsage(projectId, pid);
        if (usage) {
          this.io.emit('project:resource', usage);
        }
      } catch {
        // Process may have exited
      }
    }
  }

  private getResourceUsage(projectId: string, pid: number): ResourceUsage | null {
    try {
      // Read /proc/[pid]/stat for CPU
      const statContent = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
      const statParts = statContent.split(') ');
      if (statParts.length < 2) return null;
      const fields = statParts[1].split(' ');

      const utime = parseInt(fields[11], 10); // field 14 (0-indexed after ')')
      const stime = parseInt(fields[12], 10); // field 15

      // Calculate CPU percentage
      const now = Date.now();
      const prevSnapshot = this.cpuSnapshots.get(pid);
      let cpu = 0;

      if (prevSnapshot) {
        const timeDelta = (now - prevSnapshot.timestamp) / 1000; // seconds
        const cpuDelta = (utime + stime - prevSnapshot.utime - prevSnapshot.stime) / this.clockTicks;
        cpu = Math.min(100, (cpuDelta / timeDelta) * 100);
      }

      this.cpuSnapshots.set(pid, { utime, stime, timestamp: now });

      // Read /proc/[pid]/status for memory
      const statusContent = fs.readFileSync(`/proc/${pid}/status`, 'utf-8');
      const rssMatch = statusContent.match(/VmRSS:\s+(\d+)\s+kB/);
      const memory = rssMatch ? parseInt(rssMatch[1], 10) * 1024 : 0;

      return {
        projectId,
        pid,
        cpu: Math.round(cpu * 10) / 10,
        memory,
        timestamp: now,
      };
    } catch {
      return null;
    }
  }
}
