import { Router } from 'express';
import type { SessionService } from '../services/session.js';
import type { DiscoveryService } from '../services/discovery.js';
import type { ProcessManager } from '../services/process-manager.js';

export const sessionRoutes = Router();

// Get last session
sessionRoutes.get('/', (req, res) => {
  const sessionService: SessionService = req.app.locals.sessionService;
  const session = sessionService.getLastSession();
  res.json({ success: true, data: session });
});

// Restore session
sessionRoutes.post('/restore', async (req, res) => {
  const sessionService: SessionService = req.app.locals.sessionService;
  const discovery: DiscoveryService = req.app.locals.discovery;
  const processManager: ProcessManager = req.app.locals.processManager;

  const session = sessionService.getLastSession();
  if (!session || session.projects.length === 0) {
    return res.json({ success: true, data: { restored: 0 } });
  }

  let restored = 0;
  for (const sp of session.projects) {
    const project = discovery.getProject(sp.projectId);
    if (!project) continue;
    const result = processManager.start(project, sp.scriptName);
    if (result.success) restored++;
  }

  res.json({ success: true, data: { restored, total: session.projects.length } });
});

// Clear session
sessionRoutes.delete('/', (req, res) => {
  const sessionService: SessionService = req.app.locals.sessionService;
  sessionService.clearSession();
  res.json({ success: true });
});
