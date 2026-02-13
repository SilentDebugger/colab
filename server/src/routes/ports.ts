import { Router } from 'express';
import type { PortScanner } from '../services/port-scanner.js';

export const portRoutes = Router();

portRoutes.get('/', (req, res) => {
  const portScanner: PortScanner = req.app.locals.portScanner;
  const ports = portScanner.getPorts();
  res.json({ success: true, data: ports });
});

portRoutes.post('/scan', (req, res) => {
  const portScanner: PortScanner = req.app.locals.portScanner;
  const ports = portScanner.scan();
  res.json({ success: true, data: ports });
});
