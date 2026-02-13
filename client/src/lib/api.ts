import type { ApiResponse } from '@devdock/shared';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error || 'Unknown error');
  return json.data as T;
}

export const api = {
  // Projects
  getProjects: () => request<import('@devdock/shared').Project[]>('/projects'),
  scanProjects: () => request<import('@devdock/shared').Project[]>('/projects/scan', { method: 'POST' }),
  getProject: (id: string) => request<import('@devdock/shared').Project>(`/projects/${id}`),
  startProject: (id: string, script: string) =>
    request<{ success: boolean }>(`/projects/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ script }),
    }),
  stopProject: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}/stop`, { method: 'POST' }),
  restartProject: (id: string, script?: string) =>
    request<{ success: boolean }>(`/projects/${id}/restart`, {
      method: 'POST',
      body: JSON.stringify({ script }),
    }),
  updateNotes: (id: string, notes: string) =>
    request<{ success: boolean }>(`/projects/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
  updateHealth: (id: string, healthEndpoint: string) =>
    request<{ success: boolean }>(`/projects/${id}/health`, {
      method: 'PATCH',
      body: JSON.stringify({ healthEndpoint }),
    }),
  getLogs: (id: string) => request<import('@devdock/shared').LogEntry[]>(`/projects/${id}/logs`),

  // Ports
  getPorts: () => request<import('@devdock/shared').PortInfo[]>('/ports'),
  scanPorts: () => request<import('@devdock/shared').PortInfo[]>('/ports/scan', { method: 'POST' }),

  // Groups
  getGroups: () => request<import('@devdock/shared').ProjectGroup[]>('/groups'),
  createGroup: (name: string, projectIds: string[], description?: string) =>
    request<import('@devdock/shared').ProjectGroup>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, projectIds, description }),
    }),
  updateGroup: (id: string, data: Partial<import('@devdock/shared').ProjectGroup>) =>
    request<import('@devdock/shared').ProjectGroup>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteGroup: (id: string) =>
    request<void>(`/groups/${id}`, { method: 'DELETE' }),
  startGroup: (id: string) =>
    request<Record<string, { success: boolean }>>(`/groups/${id}/start`, { method: 'POST' }),
  stopGroup: (id: string) =>
    request<Record<string, { success: boolean }>>(`/groups/${id}/stop`, { method: 'POST' }),

  // Session
  getSession: () => request<import('@devdock/shared').SessionState | null>('/session'),
  restoreSession: () =>
    request<{ restored: number; total: number }>('/session/restore', { method: 'POST' }),
  clearSession: () => request<void>('/session', { method: 'DELETE' }),

  // Settings
  getSettings: () => request<import('@devdock/shared').Settings>('/settings'),
  updateSettings: (data: Partial<import('@devdock/shared').Settings>) =>
    request<import('@devdock/shared').Settings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
