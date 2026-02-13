import type { SessionState, SessionProject } from '@devdock/shared';
import type { StorageService } from './storage.js';
import type { ProcessManager } from './process-manager.js';

export class SessionService {
  private storage: StorageService;
  private processManager: ProcessManager;

  constructor(storage: StorageService, processManager: ProcessManager) {
    this.storage = storage;
    this.processManager = processManager;
  }

  saveSession(): SessionState {
    const running = this.processManager.getRunningProjects();
    const projects: SessionProject[] = [];

    for (const [projectId, managed] of running) {
      projects.push({
        projectId,
        scriptName: managed.scriptName,
      });
    }

    const session: SessionState = {
      projects,
      timestamp: new Date().toISOString(),
    };

    this.storage.setSession(session);
    return session;
  }

  getLastSession(): SessionState | null {
    return this.storage.getSession();
  }

  clearSession(): void {
    this.storage.setSession(null);
  }
}
