import React from 'react';
import type { ProjectStatus } from '@devdock/shared';

const statusConfig: Record<ProjectStatus, { color: string; bg: string; dot: string; label: string }> = {
  running: { color: 'text-dock-success', bg: 'bg-dock-success/10', dot: 'bg-dock-success', label: 'Running' },
  stopped: { color: 'text-dock-muted', bg: 'bg-dock-muted/10', dot: 'bg-dock-muted', label: 'Stopped' },
  crashed: { color: 'text-dock-danger', bg: 'bg-dock-danger/10', dot: 'bg-dock-danger', label: 'Crashed' },
  starting: { color: 'text-dock-warning', bg: 'bg-dock-warning/10', dot: 'bg-dock-warning', label: 'Starting' },
};

interface StatusBadgeProps {
  status: ProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`badge ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot} ${status === 'running' ? 'animate-pulse-slow' : ''}`} />
      {config.label}
    </span>
  );
}
