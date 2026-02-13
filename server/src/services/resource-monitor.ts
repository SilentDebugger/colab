import fs from 'fs';
import { execSync } from 'child_process';
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
  private cpuSnapshots: Map<string, CpuSnapshot> = new Map(); // keyed by projectId
  private clockTicks: number = 100; // sysconf(_SC_CLK_TCK), usually 100 on Linux

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
        const usage = this.getAggregatedResourceUsage(projectId, pid);
        if (usage) {
          this.io.emit('project:resource', usage);
        }
      } catch {
        // Process may have exited
      }
    }

    // Clean up stale snapshots for stopped projects
    for (const key of this.cpuSnapshots.keys()) {
      if (!running.has(key)) {
        this.cpuSnapshots.delete(key);
      }
    }
  }

  /**
   * Get CPU and memory for a process and all its descendants, summed together.
   */
  private getAggregatedResourceUsage(projectId: string, rootPid: number): ResourceUsage | null {
    const allPids = [rootPid, ...this.getDescendantPids(rootPid)];

    let totalUtime = 0;
    let totalStime = 0;
    let totalMemory = 0;
    let anySuccess = false;

    for (const pid of allPids) {
      const stats = this.readProcStats(pid);
      if (stats) {
        totalUtime += stats.utime;
        totalStime += stats.stime;
        totalMemory += stats.memory;
        anySuccess = true;
      }
    }

    if (!anySuccess) return null;

    // Calculate CPU percentage from the aggregated ticks
    const now = Date.now();
    const prevSnapshot = this.cpuSnapshots.get(projectId);
    let cpu = 0;

    if (prevSnapshot) {
      const timeDelta = (now - prevSnapshot.timestamp) / 1000;
      if (timeDelta > 0) {
        const cpuDelta = (totalUtime + totalStime - prevSnapshot.utime - prevSnapshot.stime) / this.clockTicks;
        cpu = Math.min(100, Math.max(0, (cpuDelta / timeDelta) * 100));
      }
    }

    this.cpuSnapshots.set(projectId, { utime: totalUtime, stime: totalStime, timestamp: now });

    return {
      projectId,
      pid: rootPid,
      cpu: Math.round(cpu * 10) / 10,
      memory: totalMemory,
      timestamp: now,
    };
  }

  /**
   * Read CPU ticks and RSS memory from /proc/[pid].
   */
  private readProcStats(pid: number): { utime: number; stime: number; memory: number } | null {
    try {
      // CPU from /proc/[pid]/stat
      const statContent = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
      const statParts = statContent.split(') ');
      if (statParts.length < 2) return null;
      const fields = statParts[1].split(' ');
      const utime = parseInt(fields[11], 10); // field 14 (0-indexed from after ')')
      const stime = parseInt(fields[12], 10); // field 15

      // Memory from /proc/[pid]/status
      const statusContent = fs.readFileSync(`/proc/${pid}/status`, 'utf-8');
      const rssMatch = statusContent.match(/VmRSS:\s+(\d+)\s+kB/);
      const memory = rssMatch ? parseInt(rssMatch[1], 10) * 1024 : 0;

      return { utime, stime, memory };
    } catch {
      return null;
    }
  }

  /**
   * Recursively find all descendant PIDs of a process.
   */
  private getDescendantPids(parentPid: number, depth: number = 3): number[] {
    if (depth <= 0) return [];
    try {
      const output = execSync(`ps --ppid ${parentPid} -o pid= 2>/dev/null || true`, {
        encoding: 'utf-8',
        timeout: 2000,
      });
      const children = output
        .trim()
        .split('\n')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));

      const all = [...children];
      for (const childPid of children) {
        all.push(...this.getDescendantPids(childPid, depth - 1));
      }
      return all;
    } catch {
      return [];
    }
  }
}
