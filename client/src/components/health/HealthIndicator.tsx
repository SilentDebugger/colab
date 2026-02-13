import React, { useState } from 'react';
import { Heart, HeartPulse, HeartOff, Settings2 } from 'lucide-react';
import type { HealthStatus } from '@devdock/shared';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface HealthIndicatorProps {
  projectId: string;
  status: HealthStatus;
  endpoint?: string;
  isRunning: boolean;
}

const statusConfig: Record<HealthStatus, { icon: typeof Heart; color: string; label: string }> = {
  healthy: { icon: HeartPulse, color: 'text-dock-success', label: 'Healthy' },
  unhealthy: { icon: HeartOff, color: 'text-dock-danger', label: 'Unhealthy' },
  unknown: { icon: Heart, color: 'text-dock-muted', label: 'Unknown' },
};

export function HealthIndicator({ projectId, status, endpoint, isRunning }: HealthIndicatorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(endpoint || '');

  const config = statusConfig[isRunning ? status : 'unknown'];
  const Icon = config.icon;

  const save = async () => {
    try {
      await api.updateHealth(projectId, draft);
      toast.success('Health endpoint updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update');
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="http://localhost:3000/health"
          className="input text-xs h-6 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`flex items-center gap-1 text-xs ${config.color} hover:opacity-80 transition-opacity`}
      title={`Health: ${config.label}${endpoint ? ` (${endpoint})` : ' — click to configure'}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
