import { Router } from 'express';
import type { StorageService } from '../services/storage.js';

export const settingsRoutes = Router();

// Get settings
settingsRoutes.get('/', (req, res) => {
  try {
    const storage: StorageService = req.app.locals.storage;
    res.json({ success: true, data: storage.getSettings() });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get settings: ${(err as Error).message}` });
  }
});

// Update settings
settingsRoutes.patch('/', (req, res) => {
  try {
    const storage: StorageService = req.app.locals.storage;
    const settings = storage.updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to update settings: ${(err as Error).message}` });
  }
});
