import { Router } from 'express';
import type { GroupService } from '../services/groups.js';
import type { DiscoveryService } from '../services/discovery.js';
import type { ProcessManager } from '../services/process-manager.js';
import type { SessionService } from '../services/session.js';

export const groupRoutes = Router();

// List groups
groupRoutes.get('/', (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    res.json({ success: true, data: groupService.getGroups() });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to list groups: ${(err as Error).message}` });
  }
});

// Create group
groupRoutes.post('/', (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    const { name, projectIds, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one projectId is required' });
    }

    const group = groupService.createGroup(name, projectIds, description);
    res.json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to create group: ${(err as Error).message}` });
  }
});

// Update group
groupRoutes.patch('/:id', (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    const group = groupService.updateGroup(req.params.id, req.body);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to update group: ${(err as Error).message}` });
  }
});

// Delete group
groupRoutes.delete('/:id', (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    const deleted = groupService.deleteGroup(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to delete group: ${(err as Error).message}` });
  }
});

// Start all projects in group
groupRoutes.post('/:id/start', (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    const discovery: DiscoveryService = req.app.locals.discovery;
    const processManager: ProcessManager = req.app.locals.processManager;
    const sessionService: SessionService = req.app.locals.sessionService;

    const group = groupService.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const results: Record<string, { success: boolean; error?: string }> = {};
    for (const projectId of group.projectIds) {
      const project = discovery.getProject(projectId);
      if (!project) {
        results[projectId] = { success: false, error: 'Project not found' };
        continue;
      }
      const script = req.body.scripts?.[projectId] || project.scripts[0]?.name;
      if (!script) {
        results[projectId] = { success: false, error: 'No script available' };
        continue;
      }
      results[projectId] = processManager.start(project, script);
    }

    sessionService.saveSession();
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to start group: ${(err as Error).message}` });
  }
});

// Stop all projects in group
groupRoutes.post('/:id/stop', async (req, res) => {
  try {
    const groupService: GroupService = req.app.locals.groupService;
    const processManager: ProcessManager = req.app.locals.processManager;
    const sessionService: SessionService = req.app.locals.sessionService;

    const group = groupService.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const results: Record<string, { success: boolean; error?: string }> = {};
    for (const projectId of group.projectIds) {
      results[projectId] = await processManager.stop(projectId);
    }

    sessionService.saveSession();
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to stop group: ${(err as Error).message}` });
  }
});
