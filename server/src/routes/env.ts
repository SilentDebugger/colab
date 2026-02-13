import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import type { DiscoveryService } from '../services/discovery.js';

export const envRoutes = Router();

// Get env vars for a project
envRoutes.get('/:id', (req, res) => {
  const discovery: DiscoveryService = req.app.locals.discovery;
  const project = discovery.getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  const envData = parseEnvFile(project.path);
  res.json({ success: true, data: envData });
});

// Compare env vars between two projects
envRoutes.get('/compare/:id1/:id2', (req, res) => {
  const discovery: DiscoveryService = req.app.locals.discovery;
  const p1 = discovery.getProject(req.params.id1);
  const p2 = discovery.getProject(req.params.id2);

  if (!p1 || !p2) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  const env1 = parseEnvFile(p1.path);
  const env2 = parseEnvFile(p2.path);

  const allKeys = new Set([...Object.keys(env1), ...Object.keys(env2)]);
  const comparison: Record<string, { project1?: string; project2?: string; match: boolean }> = {};

  for (const key of allKeys) {
    comparison[key] = {
      project1: env1[key],
      project2: env2[key],
      match: env1[key] === env2[key],
    };
  }

  res.json({ success: true, data: comparison });
});

function parseEnvFile(projectPath: string): Record<string, string> {
  const envFiles = ['.env', '.env.local', '.env.development'];
  const vars: Record<string, string> = {};

  for (const envFile of envFiles) {
    const filePath = path.join(projectPath, envFile);
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        let value = trimmed.substring(eqIdx + 1).trim();
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
    } catch {
      // ignore
    }
  }

  return vars;
}
