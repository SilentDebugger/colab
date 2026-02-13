import { execSync } from 'child_process';
import type { Server } from 'socket.io';
import type { PortInfo, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';
import type { ProcessManager } from './process-manager.js';

export class PortScanner {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private processManager: ProcessManager;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastPorts: PortInfo[] = [];

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, processManager: ProcessManager) {
    this.io = io;
    this.processManager = processManager;
  }

  start(intervalMs: number): void {
    this.scan(); // Initial scan
    this.interval = setInterval(() => this.scan(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getPorts(): PortInfo[] {
    return this.lastPorts;
  }

  scan(): PortInfo[] {
    try {
      const output = execSync('lsof -i -P -n -sTCP:LISTEN 2>/dev/null || true', {
        encoding: 'utf-8',
        timeout: 5000,
      });

      const ports = this.parseLsofOutput(output);
      this.detectConflicts(ports);
      this.mapToProjects(ports);

      // Only emit if changed
      const serialized = JSON.stringify(ports);
      if (serialized !== JSON.stringify(this.lastPorts)) {
        this.lastPorts = ports;
        this.io.emit('ports:update', ports);
      }

      return ports;
    } catch {
      return this.lastPorts;
    }
  }

  private parseLsofOutput(output: string): PortInfo[] {
    const lines = output.trim().split('\n');
    if (lines.length <= 1) return [];

    const ports: PortInfo[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 9) continue;

      const processName = parts[0];
      const pid = parseInt(parts[1], 10);
      const nameField = parts[8];

      // Parse the address:port format
      const match = nameField.match(/:(\d+)$/);
      if (!match) continue;

      const port = parseInt(match[1], 10);
      const key = `${pid}:${port}`;
      if (seen.has(key)) continue;
      seen.add(key);

      ports.push({
        port,
        protocol: 'tcp',
        pid,
        processName,
        state: 'LISTEN',
        conflict: false,
      });
    }

    return ports.sort((a, b) => a.port - b.port);
  }

  private detectConflicts(ports: PortInfo[]): void {
    const portMap = new Map<number, PortInfo[]>();
    for (const p of ports) {
      const list = portMap.get(p.port) || [];
      list.push(p);
      portMap.set(p.port, list);
    }

    for (const [, list] of portMap) {
      if (list.length > 1) {
        for (const p of list) p.conflict = true;
      }
    }
  }

  private mapToProjects(ports: PortInfo[]): void {
    const running = this.processManager.getRunningProjects();
    const pidToProject = new Map<number, { id: string; name: string }>();

    for (const [projectId, managed] of running) {
      const pid = managed.process.pid;
      if (pid) {
        // Also check child PIDs via process group
        pidToProject.set(pid, { id: projectId, name: projectId });
        this.getChildPids(pid).forEach(childPid => {
          pidToProject.set(childPid, { id: projectId, name: projectId });
        });
      }
    }

    for (const p of ports) {
      const project = pidToProject.get(p.pid);
      if (project) {
        p.projectId = project.id;
        p.projectName = project.name;
      }
    }
  }

  private getChildPids(parentPid: number): number[] {
    try {
      const output = execSync(`ps --ppid ${parentPid} -o pid= 2>/dev/null || true`, {
        encoding: 'utf-8',
        timeout: 3000,
      });
      return output
        .trim()
        .split('\n')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
    } catch {
      return [];
    }
  }
}
