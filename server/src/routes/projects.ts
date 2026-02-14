import { Router } from 'express';
import type { DiscoveryService } from '../services/discovery.js';
import type { ProcessManager } from '../services/process-manager.js';
import type { LogManager } from '../services/log-manager.js';
import type { HealthChecker } from '../services/health-checker.js';
import type { PortScanner } from '../services/port-scanner.js';
import type { ResourceMonitor } from '../services/resource-monitor.js';
import type { StorageService } from '../services/storage.js';
import type { SessionService } from '../services/session.js';
import type { Project } from '@devdock/shared';

export const projectRoutes = Router();

// Get all projects
projectRoutes.get('/', (req, res) => {
  try {
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;
    const healthChecker: HealthChecker = req.app.locals.healthChecker;
    const portScanner: PortScanner = req.app.locals.portScanner;

    const projects = discovery.getProjects().map(p => enrichProject(p, processManager, healthChecker, portScanner));
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to list projects: ${(err as Error).message}` });
  }
});

// Scan for projects
projectRoutes.post('/scan', async (req, res) => {
  try {
    const discovery: DiscoveryService = req.app.locals.discovery;
    const storage: StorageService = req.app.locals.storage;
    const processManager: ProcessManager = req.app.locals.processManager;
    const healthChecker: HealthChecker = req.app.locals.healthChecker;
    const portScanner: PortScanner = req.app.locals.portScanner;

    const settings = storage.getSettings();
    const dirs = settings.scanDirectories.length > 0
      ? settings.scanDirectories
      : [process.env.HOME || '/home'];

    const projects = await discovery.scan(dirs, settings.scanDepth);
    const enriched = projects.map(p => enrichProject(p, processManager, healthChecker, portScanner));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: `Scan failed: ${(err as Error).message}` });
  }
});

// Get single project
projectRoutes.get('/:id', (req, res) => {
  try {
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;
    const healthChecker: HealthChecker = req.app.locals.healthChecker;
    const portScanner: PortScanner = req.app.locals.portScanner;

    const project = discovery.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: enrichProject(project, processManager, healthChecker, portScanner) });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get project: ${(err as Error).message}` });
  }
});

// Start project
projectRoutes.post('/:id/start', (req, res) => {
  try {
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;
    const sessionService: SessionService = req.app.locals.sessionService;

    const project = discovery.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const scriptName = req.body.script || project.scripts[0]?.name;
    if (!scriptName) {
      return res.status(400).json({ success: false, error: 'No script specified and project has no scripts' });
    }

    const result = processManager.start(project, scriptName);
    if (result.success) {
      sessionService.saveSession();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to start: ${(err as Error).message}` });
  }
});

// Stop project
projectRoutes.post('/:id/stop', async (req, res) => {
  try {
    const processManager: ProcessManager = req.app.locals.processManager;
    const sessionService: SessionService = req.app.locals.sessionService;

    const result = await processManager.stop(req.params.id);
    if (result.success) {
      sessionService.saveSession();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to stop: ${(err as Error).message}` });
  }
});

// Restart project
projectRoutes.post('/:id/restart', async (req, res) => {
  try {
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;
    const sessionService: SessionService = req.app.locals.sessionService;

    const project = discovery.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const scriptName = req.body.script || processManager.getActiveScript(project.id) || project.scripts[0]?.name;
    if (!scriptName) {
      return res.status(400).json({ success: false, error: 'No script to restart' });
    }

    const result = await processManager.restart(project, scriptName);
    if (result.success) {
      sessionService.saveSession();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to restart: ${(err as Error).message}` });
  }
});

// Update notes
projectRoutes.patch('/:id/notes', (req, res) => {
  try {
    const storage: StorageService = req.app.locals.storage;
    const { notes } = req.body;
    if (typeof notes !== 'string') {
      return res.status(400).json({ success: false, error: 'notes must be a string' });
    }
    storage.setNote(req.params.id, notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to update notes: ${(err as Error).message}` });
  }
});

// Configure health endpoint
projectRoutes.patch('/:id/health', (req, res) => {
  try {
    const storage: StorageService = req.app.locals.storage;
    const discovery: DiscoveryService = req.app.locals.discovery;

    const { healthEndpoint } = req.body;
    if (healthEndpoint && typeof healthEndpoint !== 'string') {
      return res.status(400).json({ success: false, error: 'healthEndpoint must be a string URL' });
    }

    storage.setProjectData(req.params.id, { healthEndpoint: healthEndpoint || undefined });

    const project = discovery.getProject(req.params.id);
    if (project) {
      project.healthEndpoint = healthEndpoint || undefined;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to update health: ${(err as Error).message}` });
  }
});

// Get project resource usage
projectRoutes.get('/:id/resources', (req, res) => {
  try {
    const resourceMonitor: ResourceMonitor = req.app.locals.resourceMonitor;
    const usage = resourceMonitor.getUsage(req.params.id);
    res.json({ success: true, data: usage });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get resources: ${(err as Error).message}` });
  }
});

// Get project logs
projectRoutes.get('/:id/logs', (req, res) => {
  try {
    const logManager: LogManager = req.app.locals.logManager;
    const logs = logManager.getBuffer(req.params.id);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get logs: ${(err as Error).message}` });
  }
});

function enrichProject(project: Project, pm: ProcessManager, hc: HealthChecker, ps: PortScanner): Project {
  const projectPorts = ps.getPorts()
    .filter(p => p.projectId === project.id)
    .map(p => p.port);
  return {
    ...project,
    status: pm.isRunning(project.id) ? 'running' : project.status === 'crashed' ? 'crashed' : 'stopped',
    pid: pm.getPid(project.id),
    activeScript: pm.getActiveScript(project.id),
    healthStatus: hc.getStatus(project.id),
    ports: projectPorts,
  };
}
