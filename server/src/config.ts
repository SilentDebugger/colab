import path from 'path';
import os from 'os';

export const CONFIG = {
  port: parseInt(process.env.DEVDOCK_PORT || '3001', 10),
  storagePath: process.env.DEVDOCK_STORAGE || path.join(os.homedir(), '.devdock', 'state.json'),
  corsOrigin: process.env.DEVDOCK_CORS || 'http://localhost:5173',
  logBufferSize: 1000,
  defaultScanDirs: [os.homedir()],
  defaultScanDepth: 2,
};
