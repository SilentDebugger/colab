import { v4 as uuid } from 'uuid';
import type { ProjectGroup } from '@devdock/shared';
import type { StorageService } from './storage.js';

export class GroupService {
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  getGroups(): ProjectGroup[] {
    return this.storage.getGroups();
  }

  getGroup(id: string): ProjectGroup | undefined {
    return this.storage.getGroups().find(g => g.id === id);
  }

  createGroup(name: string, projectIds: string[], description?: string): ProjectGroup {
    const groups = this.storage.getGroups();
    const group: ProjectGroup = {
      id: uuid(),
      name,
      projectIds,
      description,
    };
    groups.push(group);
    this.storage.setGroups(groups);
    return group;
  }

  updateGroup(id: string, updates: Partial<Omit<ProjectGroup, 'id'>>): ProjectGroup | null {
    const groups = this.storage.getGroups();
    const idx = groups.findIndex(g => g.id === id);
    if (idx === -1) return null;

    groups[idx] = { ...groups[idx], ...updates };
    this.storage.setGroups(groups);
    return groups[idx];
  }

  deleteGroup(id: string): boolean {
    const groups = this.storage.getGroups();
    const filtered = groups.filter(g => g.id !== id);
    if (filtered.length === groups.length) return false;
    this.storage.setGroups(filtered);
    return true;
  }
}
