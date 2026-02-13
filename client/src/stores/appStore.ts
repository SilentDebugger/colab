import { create } from 'zustand';
import type { Project, PortInfo, ProjectGroup, LogEntry, ResourceUsage, Settings } from '@devdock/shared';

export type ViewPage = 'dashboard' | 'ports' | 'groups' | 'settings' | 'logs';

interface AppState {
  // UI state
  currentPage: ViewPage;
  setPage: (page: ViewPage) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  logsPanelProjectId: string | null;
  setLogsPanelProjectId: (id: string | null) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  showSessionRestore: boolean;
  setShowSessionRestore: (show: boolean) => void;

  // Data state
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  ports: PortInfo[];
  setPorts: (ports: PortInfo[]) => void;

  groups: ProjectGroup[];
  setGroups: (groups: ProjectGroup[]) => void;

  logs: Record<string, LogEntry[]>;
  appendLog: (entry: LogEntry) => void;
  clearLogs: (projectId: string) => void;

  resources: Record<string, ResourceUsage>;
  updateResource: (usage: ResourceUsage) => void;

  settings: Settings | null;
  setSettings: (settings: Settings) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // UI state
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  statusFilter: 'all',
  setStatusFilter: (f) => set({ statusFilter: f }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  logsPanelProjectId: null,
  setLogsPanelProjectId: (id) => set({ logsPanelProjectId: id }),
  showCommandPalette: false,
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  showSessionRestore: false,
  setShowSessionRestore: (show) => set({ showSessionRestore: show }),

  // Data state
  projects: [],
  setProjects: (projects) => set({ projects }),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  ports: [],
  setPorts: (ports) => set({ ports }),

  groups: [],
  setGroups: (groups) => set({ groups }),

  logs: {},
  appendLog: (entry) =>
    set((state) => {
      const existing = state.logs[entry.projectId] || [];
      const updated = [...existing, entry];
      // Keep last 2000 entries per project on client
      if (updated.length > 2000) updated.splice(0, updated.length - 2000);
      return { logs: { ...state.logs, [entry.projectId]: updated } };
    }),
  clearLogs: (projectId) =>
    set((state) => {
      const { [projectId]: _, ...rest } = state.logs;
      return { logs: rest };
    }),

  resources: {},
  updateResource: (usage) =>
    set((state) => ({
      resources: { ...state.resources, [usage.projectId]: usage },
    })),

  settings: null,
  setSettings: (settings) => set({ settings }),
}));
