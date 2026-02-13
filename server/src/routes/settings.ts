import { Router } from 'express';
import type { StorageService } from '../services/storage.js';

export const settingsRoutes = Router();

// Get settings
settingsRoutes.get('/', (req, res) => {
  const storage: StorageService = req.app.locals.storage;
  res.json({ success: true, data: storage.getSettings() });
});

// Update settings
settingsRoutes.patch('/', (req, res) => {
  const storage: StorageService = req.app.locals.storage;
  const settings = storage.updateSettings(req.body);
  res.json({ success: true, data: settings });
});
