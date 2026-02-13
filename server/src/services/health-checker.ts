import type { Server } from 'socket.io';
import type { HealthStatus, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';
import type { DiscoveryService } from './discovery.js';
import type { ProcessManager } from './process-manager.js';

export class HealthChecker {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private discovery: DiscoveryService;
  private processManager: ProcessManager;
  private interval: ReturnType<typeof setInterval> | null = null;
  private healthStatuses: Map<string, HealthStatus> = new Map();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    discovery: DiscoveryService,
    processManager: ProcessManager
  ) {
    this.io = io;
    this.discovery = discovery;
    this.processManager = processManager;
  }

  start(intervalMs: number): void {
    this.interval = setInterval(() => this.checkAll(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getStatus(projectId: string): HealthStatus {
    return this.healthStatuses.get(projectId) || 'unknown';
  }

  async checkAll(): Promise<void> {
    const projects = this.discovery.getProjects();
    for (const project of projects) {
      if (!this.processManager.isRunning(project.id)) {
        this.updateStatus(project.id, 'unknown');
        continue;
      }
      if (!project.healthEndpoint) continue;

      const status = await this.checkEndpoint(project.healthEndpoint);
      this.updateStatus(project.id, status);
    }
  }

  async checkEndpoint(url: string): Promise<HealthStatus> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeout);
      return response.ok ? 'healthy' : 'unhealthy';
    } catch {
      return 'unhealthy';
    }
  }

  private updateStatus(projectId: string, status: HealthStatus): void {
    const prev = this.healthStatuses.get(projectId);
    if (prev !== status) {
      this.healthStatuses.set(projectId, status);
      this.io.emit('project:health', { projectId, status });
    }
  }
}
