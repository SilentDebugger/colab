import { spawn, type ChildProcess } from 'child_process';
import type { Server } from 'socket.io';
import type { Project, ProjectStatus, ServerToClientEvents, ClientToServerEvents } from '@devdock/shared';
import type { LogManager } from './log-manager.js';

interface ManagedProcess {
  process: ChildProcess;
  projectId: string;
  scriptName: string;
  startedAt: number;
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private logManager: LogManager;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, logManager: LogManager) {
    this.io = io;
    this.logManager = logManager;
  }

  getRunningProjects(): Map<string, ManagedProcess> {
    return this.processes;
  }

  isRunning(projectId: string): boolean {
    return this.processes.has(projectId);
  }

  getPid(projectId: string): number | undefined {
    return this.processes.get(projectId)?.process.pid;
  }

  getActiveScript(projectId: string): string | undefined {
    return this.processes.get(projectId)?.scriptName;
  }

  start(project: Project, scriptName: string): { success: boolean; error?: string } {
    if (this.processes.has(project.id)) {
      return { success: false, error: 'Project is already running' };
    }

    const script = project.scripts.find(s => s.name === scriptName);
    if (!script) {
      return { success: false, error: `Script "${scriptName}" not found` };
    }

    // Always run the command through a shell to maintain consistent process tracking.
    // Running `npm run X` directly causes npm to exec-replace itself, reparenting the
    // actual process to PID 1 and losing our handle on it.
    let shellCmd: string;

    switch (project.configType) {
      case 'package.json':
        // Run the actual script command directly instead of through npm,
        // which gives us a stable process tree
        shellCmd = script.command;
        break;
      case 'Makefile':
        shellCmd = `make ${scriptName}`;
        break;
      case 'docker-compose.yml':
        shellCmd = script.command;
        break;
      case '.devdock.yml':
        shellCmd = script.command;
        break;
      default:
        shellCmd = script.command;
    }

    const command = '/bin/sh';
    const args = ['-c', shellCmd];

    try {
      const child = spawn(command, args, {
        cwd: project.path,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' },
        detached: false,
      });

      const managed: ManagedProcess = {
        process: child,
        projectId: project.id,
        scriptName,
        startedAt: Date.now(),
      };

      this.processes.set(project.id, managed);
      this.emitStatus(project.id, 'running', child.pid);

      child.stdout?.on('data', (data: Buffer) => {
        this.logManager.append(project.id, 'stdout', data.toString());
      });

      child.stderr?.on('data', (data: Buffer) => {
        this.logManager.append(project.id, 'stderr', data.toString());
      });

      child.on('exit', (code, signal) => {
        this.processes.delete(project.id);
        const status: ProjectStatus = code === 0 || signal === 'SIGTERM' ? 'stopped' : 'crashed';
        this.emitStatus(project.id, status);
        this.logManager.append(
          project.id,
          'stderr',
          `\n[DevDock] Process exited with code ${code}, signal ${signal}\n`
        );
      });

      child.on('error', (err) => {
        this.processes.delete(project.id);
        this.emitStatus(project.id, 'crashed');
        this.logManager.append(
          project.id,
          'stderr',
          `\n[DevDock] Process error: ${err.message}\n`
        );
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: `Failed to start: ${(err as Error).message}` };
    }
  }

  async stop(projectId: string): Promise<{ success: boolean; error?: string }> {
    const managed = this.processes.get(projectId);
    if (!managed) {
      return { success: false, error: 'Project is not running' };
    }

    return new Promise((resolve) => {
      const { process: child } = managed;
      let killed = false;

      const forceKillTimer = setTimeout(() => {
        if (!killed) {
          killed = true;
          try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }
      }, 5000);

      child.once('exit', () => {
        clearTimeout(forceKillTimer);
        resolve({ success: true });
      });

      try {
        child.kill('SIGTERM');
      } catch {
        clearTimeout(forceKillTimer);
        this.processes.delete(projectId);
        this.emitStatus(projectId, 'stopped');
        resolve({ success: true });
      }
    });
  }

  async restart(project: Project, scriptName: string): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning(project.id)) {
      const stopResult = await this.stop(project.id);
      if (!stopResult.success) return stopResult;
      // Small delay to allow port release
      await new Promise(r => setTimeout(r, 500));
    }
    return this.start(project, scriptName);
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.processes.keys()).map(id => this.stop(id));
    await Promise.allSettled(stopPromises);
  }

  private emitStatus(projectId: string, status: ProjectStatus, pid?: number): void {
    this.io.emit('project:status', { projectId, status, pid });
  }
}
