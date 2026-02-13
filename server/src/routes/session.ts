import { Router } from 'express';
import type { SessionService } from '../services/session.js';
import type { DiscoveryService } from '../services/discovery.js';
import type { ProcessManager } from '../services/process-manager.js';

export const sessionRoutes = Router();

// Get last session
sessionRoutes.get('/', (req, res) => {
  try {
    const sessionService: SessionService = req.app.locals.sessionService;
    const session = sessionService.getLastSession();
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get session: ${(err as Error).message}` });
  }
});

// Restore session
sessionRoutes.post('/restore', async (req, res) => {
  try {
    const sessionService: SessionService = req.app.locals.sessionService;
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;

    const session = sessionService.getLastSession();
    if (!session || session.projects.length === 0) {
      return res.json({ success: true, data: { restored: 0, total: 0 } });
    }

    let restored = 0;
    const errors: string[] = [];
    for (const sp of session.projects) {
      const project = discovery.getProject(sp.projectId);
      if (!project) {
        errors.push(`Project ${sp.projectId} not found (may need re-scan)`);
        continue;
      }
      const result = processManager.start(project, sp.scriptName);
      if (result.success) {
        restored++;
      } else {
        errors.push(`${project.name}: ${result.error}`);
      }
    }

    res.json({ success: true, data: { restored, total: session.projects.length, errors } });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to restore session: ${(err as Error).message}` });
  }
});

// Clear session
sessionRoutes.delete('/', (req, res) => {
  try {
    const sessionService: SessionService = req.app.locals.sessionService;
    sessionService.clearSession();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to clear session: ${(err as Error).message}` });
  }
});
