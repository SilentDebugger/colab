import type { Server } from 'socket.io';
import type { HealthStatus, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';
import type { DiscoveryService } from './discovery.js';
import type { ProcessManager } from './process-manager.js';
import type { PortScanner } from './port-scanner.js';

const COMMON_HEALTH_PATHS = ['/health', '/healthz', '/api/health', '/api/healthz', '/ready'];

export class HealthChecker {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private discovery: DiscoveryService;
  private processManager: ProcessManager;
  private portScanner: PortScanner | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private autoDetectedEndpoints: Map<string, string> = new Map();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    discovery: DiscoveryService,
    processManager: ProcessManager
  ) {
    this.io = io;
    this.discovery = discovery;
    this.processManager = processManager;
  }

  /** Called after PortScanner is available to enable auto-detection */
  setPortScanner(portScanner: PortScanner): void {
    this.portScanner = portScanner;
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
        this.autoDetectedEndpoints.delete(project.id);
        continue;
      }

      // Use explicitly configured endpoint first
      let endpoint = project.healthEndpoint;

      // If none configured, check if we already auto-detected one
      if (!endpoint) {
        endpoint = this.autoDetectedEndpoints.get(project.id);
      }

      // If still none, try to auto-detect by probing common paths on the project's ports
      if (!endpoint) {
        endpoint = await this.autoDetectEndpoint(project.id);
        if (endpoint) {
          this.autoDetectedEndpoints.set(project.id, endpoint);
        }
      }

      if (!endpoint) {
        // No endpoint found — leave as unknown
        continue;
      }

      const status = await this.checkEndpoint(endpoint);
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

  /**
   * Auto-detect a health endpoint by trying common paths on the project's ports.
   */
  private async autoDetectEndpoint(projectId: string): Promise<string | undefined> {
    if (!this.portScanner) return undefined;

    // Find ports owned by this project
    const ports = this.portScanner
      .getPorts()
      .filter((p) => p.projectId === projectId)
      .map((p) => p.port);

    if (ports.length === 0) return undefined;

    // Try each port + path combination
    for (const port of ports) {
      for (const path of COMMON_HEALTH_PATHS) {
        const url = `http://localhost:${port}${path}`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);

          const response = await fetch(url, {
            signal: controller.signal,
            method: 'GET',
          });

          clearTimeout(timeout);

          if (response.ok) {
            // Verify it looks like a health response (JSON or short text body)
            const text = await response.text();
            if (text.length < 2000) {
              return url;
            }
          }
        } catch {
          // Not available on this port/path — try next
        }
      }
    }

    return undefined;
  }

  private updateStatus(projectId: string, status: HealthStatus): void {
    const prev = this.healthStatuses.get(projectId);
    if (prev !== status) {
      this.healthStatuses.set(projectId, status);
      this.io.emit('project:health', { projectId, status });
    }
  }
}
