// ─── Project Types ───────────────────────────────────────────────────────────

export type ProjectStatus = 'running' | 'stopped' | 'crashed' | 'starting';
export type ConfigType = 'package.json' | 'docker-compose.yml' | 'Makefile' | '.devdock.yml';
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';
export type LogStream = 'stdout' | 'stderr';

export interface ProjectScript {
  name: string;
  command: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  configType: ConfigType;
  scripts: ProjectScript[];
  status: ProjectStatus;
  pid?: number;
  ports: number[];
  healthEndpoint?: string;
  healthStatus: HealthStatus;
  group?: string;
  notes: string;
  lastStarted?: string;
  lastStopped?: string;
  gitRemote?: string;
  activeScript?: string;
  cpu?: number;       // percentage
  memory?: number;    // bytes
}

// ─── Port Map Types ──────────────────────────────────────────────────────────

export interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  pid: number;
  processName: string;
  projectId?: string;
  projectName?: string;
  state: 'LISTEN' | 'ESTABLISHED' | string;
  conflict: boolean;
}

// ─── Log Types ───────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: number;
  projectId: string;
  stream: LogStream;
  text: string;
}

// ─── Group Types ─────────────────────────────────────────────────────────────

export interface ProjectGroup {
  id: string;
  name: string;
  projectIds: string[];
  description?: string;
}

// ─── Session Types ───────────────────────────────────────────────────────────

export interface SessionProject {
  projectId: string;
  scriptName: string;
}

export interface SessionState {
  projects: SessionProject[];
  timestamp: string;
}

// ─── Resource Types ──────────────────────────────────────────────────────────

export interface ResourceUsage {
  projectId: string;
  pid: number;
  cpu: number;       // percentage (0-100)
  memory: number;    // bytes (RSS)
  timestamp: number;
}

// ─── Settings Types ──────────────────────────────────────────────────────────

export interface Settings {
  scanDirectories: string[];
  scanDepth: number;
  editorCommand: string;
  healthCheckInterval: number;    // ms
  resourceMonitorInterval: number; // ms
  portScanInterval: number;       // ms
}

export const DEFAULT_SETTINGS: Settings = {
  scanDirectories: [],
  scanDepth: 2,
  editorCommand: 'code',
  healthCheckInterval: 10000,
  resourceMonitorInterval: 5000,
  portScanInterval: 5000,
};

// ─── Storage Types ───────────────────────────────────────────────────────────

export interface StorageData {
  projects: Record<string, Partial<Project>>;
  groups: ProjectGroup[];
  session: SessionState | null;
  settings: Settings;
  notes: Record<string, string>;
}

// ─── WebSocket Event Types ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  'project:status': (data: { projectId: string; status: ProjectStatus; pid?: number }) => void;
  'project:log': (data: LogEntry) => void;
  'project:health': (data: { projectId: string; status: HealthStatus }) => void;
  'project:resource': (data: ResourceUsage) => void;
  'ports:update': (data: PortInfo[]) => void;
  'session:saved': (data: SessionState) => void;
}

export interface ClientToServerEvents {
  'logs:subscribe': (projectId: string) => void;
  'logs:unsubscribe': (projectId: string) => void;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
