import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './config.js';
import { setupWebSocket } from './websocket/index.js';
import { projectRoutes } from './routes/projects.js';
import { portRoutes } from './routes/ports.js';
import { groupRoutes } from './routes/groups.js';
import { sessionRoutes } from './routes/session.js';
import { settingsRoutes } from './routes/settings.js';
import { envRoutes } from './routes/env.js';
import { StorageService } from './services/storage.js';
import { DiscoveryService } from './services/discovery.js';
import { ProcessManager } from './services/process-manager.js';
import { LogManager } from './services/log-manager.js';
import { PortScanner } from './services/port-scanner.js';
import { HealthChecker } from './services/health-checker.js';
import { ResourceMonitor } from './services/resource-monitor.js';
import { GroupService } from './services/groups.js';
import { SessionService } from './services/session.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@devdock/shared';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CONFIG.corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Middleware
app.use(cors({ origin: CONFIG.corsOrigin }));
app.use(express.json());

// Initialize services
const storage = new StorageService(CONFIG.storagePath);
const logManager = new LogManager(CONFIG.logBufferSize, io);
const processManager = new ProcessManager(io, logManager);
const discovery = new DiscoveryService(storage);
const portScanner = new PortScanner(io, processManager);
const healthChecker = new HealthChecker(io, discovery, processManager);
const resourceMonitor = new ResourceMonitor(io, processManager);
const groupService = new GroupService(storage);
const sessionService = new SessionService(storage, processManager);

// Make services available to routes
app.locals.storage = storage;
app.locals.discovery = discovery;
app.locals.processManager = processManager;
app.locals.logManager = logManager;
app.locals.portScanner = portScanner;
app.locals.healthChecker = healthChecker;
app.locals.resourceMonitor = resourceMonitor;
app.locals.groupService = groupService;
app.locals.sessionService = sessionService;

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/ports', portRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/env', envRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(import.meta.dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// WebSocket
setupWebSocket(io, logManager);

// Start
async function start() {
  await storage.load();

  const settings = storage.getSettings();

  // Start background services
  portScanner.start(settings.portScanInterval);
  healthChecker.start(settings.healthCheckInterval);
  resourceMonitor.start(settings.resourceMonitorInterval);

  httpServer.listen(CONFIG.port, () => {
    console.log(`🚀 DevDock server running at http://localhost:${CONFIG.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start DevDock:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

async function shutdown() {
  console.log('\n🛑 Shutting down DevDock...');
  portScanner.stop();
  healthChecker.stop();
  resourceMonitor.stop();
  await processManager.stopAll();
  await storage.save();
  httpServer.close();
  process.exit(0);
}
