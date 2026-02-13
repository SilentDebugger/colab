import { Router } from 'express';
import type { PortScanner } from '../services/port-scanner.js';

export const portRoutes = Router();

portRoutes.get('/', (req, res) => {
  try {
    const portScanner: PortScanner = req.app.locals.portScanner;
    const ports = portScanner.getPorts();
    res.json({ success: true, data: ports });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to get ports: ${(err as Error).message}` });
  }
});

portRoutes.post('/scan', (req, res) => {
  try {
    const portScanner: PortScanner = req.app.locals.portScanner;
    const ports = portScanner.scan();
    res.json({ success: true, data: ports });
  } catch (err) {
    res.status(500).json({ success: false, error: `Port scan failed: ${(err as Error).message}` });
  }
});
