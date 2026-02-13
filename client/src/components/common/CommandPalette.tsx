import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Square, ScrollText, RotateCw } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export function CommandPalette() {
  const { showCommandPalette, setShowCommandPalette, projects, setLogsPanelProjectId, setPage } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showCommandPalette]);

  if (!showCommandPalette) return null;

  type Action = {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    action: () => void;
  };

  const actions: Action[] = [];

  // Project actions
  const q = query.toLowerCase();
  for (const project of projects) {
    if (q && !project.name.toLowerCase().includes(q) && !project.path.toLowerCase().includes(q)) continue;

    if (project.status === 'running') {
      actions.push({
        id: `stop-${project.id}`,
        label: `Stop ${project.name}`,
        description: project.path,
        icon: <Square className="w-3.5 h-3.5 text-dock-danger" />,
        action: async () => {
          await api.stopProject(project.id);
          toast.success(`Stopped ${project.name}`);
        },
      });
      actions.push({
        id: `restart-${project.id}`,
        label: `Restart ${project.name}`,
        description: project.path,
        icon: <RotateCw className="w-3.5 h-3.5 text-dock-warning" />,
        action: async () => {
          await api.restartProject(project.id);
          toast.success(`Restarted ${project.name}`);
        },
      });
    } else {
      for (const script of project.scripts.slice(0, 3)) {
        actions.push({
          id: `start-${project.id}-${script.name}`,
          label: `Start ${project.name} → ${script.name}`,
          description: project.path,
          icon: <Play className="w-3.5 h-3.5 text-dock-success" />,
          action: async () => {
            await api.startProject(project.id, script.name);
            toast.success(`Started ${project.name}`);
          },
        });
      }
    }

    actions.push({
      id: `logs-${project.id}`,
      label: `View logs: ${project.name}`,
      description: project.path,
      icon: <ScrollText className="w-3.5 h-3.5 text-dock-accent" />,
      action: () => {
        setLogsPanelProjectId(project.id);
      },
    });
  }

  const execute = (action: Action) => {
    setShowCommandPalette(false);
    action.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, actions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && actions[selectedIdx]) {
      execute(actions[selectedIdx]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-fade-in"
      onClick={() => setShowCommandPalette(false)}
    >
      <div
        className="w-[520px] bg-dock-surface border border-dock-border rounded-xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dock-border">
          <Search className="w-4 h-4 text-dock-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search projects..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-dock-muted"
          />
          <kbd className="text-[10px] text-dock-muted bg-dock-bg px-1.5 py-0.5 rounded border border-dock-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {actions.length === 0 ? (
            <div className="px-4 py-6 text-center text-dock-muted text-sm">No matching commands</div>
          ) : (
            actions.slice(0, 20).map((action, idx) => (
              <button
                key={action.id}
                onClick={() => execute(action)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  idx === selectedIdx ? 'bg-dock-accent/10 text-dock-text' : 'text-dock-text-dim hover:bg-dock-hover'
                }`}
              >
                {action.icon}
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{action.label}</div>
                  <div className="text-[10px] text-dock-muted truncate">{action.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
