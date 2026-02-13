import React from 'react';
import type { Project } from '@devdock/shared';
import { ProjectCard } from './ProjectCard';
import { useAppStore } from '../../stores/appStore';
import { FolderSearch, RefreshCw } from 'lucide-react';

interface ProjectGridProps {
  projects: Project[];
  loading: boolean;
  onScan: () => void;
}

export function ProjectGrid({ projects, loading, onScan }: ProjectGridProps) {
  const { searchQuery, statusFilter } = useAppStore();

  // Filter projects
  let filtered = projects;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.configType.toLowerCase().includes(q) ||
        p.group?.toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Sort: running first, then crashed, then stopped; alphabetical within
  filtered.sort((a, b) => {
    const order = { running: 0, crashed: 1, starting: 2, stopped: 3 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-dock-muted">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p>Scanning for projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-dock-muted">
        <FolderSearch className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No projects found</p>
        <p className="text-sm mb-4">Configure your scan directories and hit scan to discover projects.</p>
        <button onClick={onScan} className="btn-primary">
          Scan for Projects
        </button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-dock-muted">
        <FolderSearch className="w-8 h-8 mb-4 opacity-50" />
        <p className="text-sm">No projects match your filters</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-dock-muted">
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-1 ml-auto">
          {['all', 'running', 'stopped', 'crashed'].map((status) => (
            <button
              key={status}
              onClick={() => useAppStore.getState().setStatusFilter(status)}
              className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-dock-accent/15 text-dock-accent-light'
                  : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
