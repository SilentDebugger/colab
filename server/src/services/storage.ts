import fs from 'fs';
import path from 'path';
import type { StorageData, Settings, ProjectGroup, SessionState, DEFAULT_SETTINGS } from '@devdock/shared';

const DEFAULTS: StorageData = {
  projects: {},
  groups: [],
  session: null,
  settings: {
    scanDirectories: [],
    scanDepth: 2,
    editorCommand: 'code',
    healthCheckInterval: 10000,
    resourceMonitorInterval: 5000,
    portScanInterval: 5000,
  },
  notes: {},
};

export class StorageService {
  private data: StorageData = structuredClone(DEFAULTS);
  private filePath: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StorageData>;
        this.data = { ...structuredClone(DEFAULTS), ...parsed };
      }
    } catch (err) {
      console.error('Failed to load storage, using defaults:', err);
      this.data = structuredClone(DEFAULTS);
    }
  }

  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = this.filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('Failed to save storage:', err);
    }
  }

  debouncedSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), 1000);
  }

  // Settings
  getSettings(): Settings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.debouncedSave();
    return this.data.settings;
  }

  // Notes
  getNote(projectId: string): string {
    return this.data.notes[projectId] || '';
  }

  setNote(projectId: string, note: string): void {
    this.data.notes[projectId] = note;
    this.debouncedSave();
  }

  getAllNotes(): Record<string, string> {
    return this.data.notes;
  }

  // Groups
  getGroups(): ProjectGroup[] {
    return this.data.groups;
  }

  setGroups(groups: ProjectGroup[]): void {
    this.data.groups = groups;
    this.debouncedSave();
  }

  // Session
  getSession(): SessionState | null {
    return this.data.session;
  }

  setSession(session: SessionState | null): void {
    this.data.session = session;
    this.debouncedSave();
  }

  // Project overrides (health endpoints, etc.)
  getProjectData(projectId: string): Partial<import('@devdock/shared').Project> {
    return this.data.projects[projectId] || {};
  }

  setProjectData(projectId: string, data: Partial<import('@devdock/shared').Project>): void {
    this.data.projects[projectId] = { ...this.data.projects[projectId], ...data };
    this.debouncedSave();
  }
}
