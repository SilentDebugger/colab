import { spawn, execSync, type ChildProcess } from 'child_process';
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

    // Build the shell command based on config type
    let shellCmd: string;

    switch (project.configType) {
      case 'package.json':
        // Run the actual script command directly for stable process tracking
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

    try {
      // Use exec in the shell so it replaces the shell process.
      // Combined with detached: true, this gives us a process group we can kill cleanly.
      const child = spawn('/bin/sh', ['-c', `exec ${shellCmd}`], {
        cwd: project.path,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' },
        detached: true, // Create new process group for clean teardown
      });

      // Don't let the child keep the parent alive if we exit
      child.unref();
      // But re-ref it so our exit handlers work
      child.ref();

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
        const status: ProjectStatus = code === 0 || signal === 'SIGTERM' || signal === 'SIGKILL' ? 'stopped' : 'crashed';
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
      const pid = child.pid;
      let settled = false;

      const forceKillTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          // Kill entire process group
          this.killProcessTree(pid);
          this.processes.delete(projectId);
          this.emitStatus(projectId, 'stopped');
          resolve({ success: true });
        }
      }, 5000);

      child.once('exit', () => {
        if (!settled) {
          settled = true;
          clearTimeout(forceKillTimer);
          // Also kill any remaining children just in case
          this.killProcessTree(pid);
          resolve({ success: true });
        }
      });

      try {
        // Kill the entire process group (negative PID = group)
        if (pid) {
          try {
            process.kill(-pid, 'SIGTERM');
          } catch {
            // Fallback: kill just the process
            child.kill('SIGTERM');
          }
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(forceKillTimer);
          this.processes.delete(projectId);
          this.emitStatus(projectId, 'stopped');
          resolve({ success: true });
        }
      }
    });
  }

  async restart(project: Project, scriptName: string): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning(project.id)) {
      const stopResult = await this.stop(project.id);
      if (!stopResult.success) return stopResult;
      // Wait for port release
      await new Promise(r => setTimeout(r, 1000));
    }
    return this.start(project, scriptName);
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.processes.keys()).map(id => this.stop(id));
    await Promise.allSettled(stopPromises);
  }

  /**
   * Kill a process and all its descendants.
   */
  private killProcessTree(pid: number | undefined): void {
    if (!pid) return;
    try {
      // Try killing the process group first
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Fallback: find and kill child processes individually
      try {
        const children = execSync(`ps --ppid ${pid} -o pid= 2>/dev/null || true`, {
          encoding: 'utf-8',
          timeout: 3000,
        });
        for (const line of children.trim().split('\n')) {
          const childPid = parseInt(line.trim(), 10);
          if (!isNaN(childPid)) {
            try { process.kill(childPid, 'SIGKILL'); } catch { /* already dead */ }
          }
        }
        try { process.kill(pid, 'SIGKILL'); } catch { /* already dead */ }
      } catch {
        // Best effort
      }
    }
  }

  private emitStatus(projectId: string, status: ProjectStatus, pid?: number): void {
    this.io.emit('project:status', { projectId, status, pid });
  }
}
