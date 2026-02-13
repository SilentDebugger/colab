import React, { useMemo } from 'react';
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
  const [groupFilter, setGroupFilter] = React.useState('all');

  // Collect unique groups for the filter dropdown
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.group) set.add(p.group);
    }
    return Array.from(set).sort();
  }, [projects]);

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
  if (groupFilter !== 'all') {
    filtered = filtered.filter((p) => p.group === groupFilter);
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
      <div>
        <FilterBar
          statusFilter={statusFilter}
          groupFilter={groupFilter}
          groups={groups}
          onGroupChange={setGroupFilter}
          totalCount={projects.length}
          filteredCount={0}
        />
        <div className="flex flex-col items-center justify-center h-48 text-dock-muted">
          <FolderSearch className="w-8 h-8 mb-4 opacity-50" />
          <p className="text-sm">No projects match your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FilterBar
        statusFilter={statusFilter}
        groupFilter={groupFilter}
        groups={groups}
        onGroupChange={setGroupFilter}
        totalCount={projects.length}
        filteredCount={filtered.length}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function FilterBar({
  statusFilter,
  groupFilter,
  groups,
  onGroupChange,
  totalCount,
  filteredCount,
}: {
  statusFilter: string;
  groupFilter: string;
  groups: string[];
  onGroupChange: (g: string) => void;
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-dock-muted">
        {filteredCount === totalCount
          ? `${totalCount} project${totalCount !== 1 ? 's' : ''}`
          : `${filteredCount} of ${totalCount} projects`}
      </span>

      {/* Group filter */}
      {groups.length > 0 && (
        <select
          value={groupFilter}
          onChange={(e) => onGroupChange(e.target.value)}
          className="text-xs px-2 py-1 rounded-full bg-dock-bg border border-dock-border text-dock-text-dim
                     focus:outline-none focus:ring-1 focus:ring-dock-accent ml-2 appearance-none cursor-pointer
                     hover:border-dock-accent/30 transition-colors pr-6"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      )}

      {/* Status filter */}
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
  );
}
