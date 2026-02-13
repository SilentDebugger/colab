import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  ScrollText,
  ExternalLink,
  Github,
  FolderOpen,
  Terminal,
  Code2,
  Cpu,
  HardDrive,
  ChevronDown,
  Globe,
} from 'lucide-react';
import type { Project } from '@devdock/shared';
import { StatusBadge } from './StatusBadge';
import { QuickNotes } from './QuickNotes';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';
import toast from 'react-hot-toast';

interface ProjectCardProps {
  project: Project;
}

const configIcons: Record<string, string> = {
  'package.json': '📦',
  'docker-compose.yml': '🐳',
  'Makefile': '⚙️',
  '.devdock.yml': '🚀',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showScripts, setShowScripts] = useState(false);
  const { updateProject, setLogsPanelProjectId, resources } = useAppStore();
  const resource = resources[project.id];

  const handleStart = async (scriptName: string) => {
    setActionLoading('start');
    try {
      await api.startProject(project.id, scriptName);
      toast.success(`Started ${project.name}`);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
      setShowScripts(false);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await api.stopProject(project.id);
      toast.success(`Stopped ${project.name}`);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    setActionLoading('restart');
    try {
      await api.restartProject(project.id);
      toast.success(`Restarted ${project.name}`);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="card animate-fade-in group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" title={project.configType}>
            {configIcons[project.configType] || '📁'}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{project.name}</h3>
            <p className="text-[11px] text-dock-muted truncate" title={project.path}>
              {project.path}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Health dot */}
          {project.healthEndpoint && project.status === 'running' && (
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                project.healthStatus === 'healthy'
                  ? 'bg-dock-success'
                  : project.healthStatus === 'unhealthy'
                  ? 'bg-dock-danger animate-pulse'
                  : 'bg-dock-muted'
              }`}
              title={`Health: ${project.healthStatus}`}
            />
          )}
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Resource usage (when running) */}
      {project.status === 'running' && resource && (
        <div className="flex items-center gap-4 mb-3 text-[11px] text-dock-text-dim">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {resource.cpu.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatBytes(resource.memory)}
          </span>
        </div>
      )}

      {/* Port badges */}
      {project.ports.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.ports.map((port) => (
            <a
              key={port}
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="badge bg-dock-accent/10 text-dock-accent-light hover:bg-dock-accent/20 transition-colors cursor-pointer"
            >
              :{port}
            </a>
          ))}
        </div>
      )}

      {/* Active script indicator */}
      {project.activeScript && project.status === 'running' && (
        <div className="text-[11px] text-dock-accent-light mb-3 flex items-center gap-1">
          <Play className="w-3 h-3" />
          Running: <code className="font-mono bg-dock-accent/10 px-1 rounded">{project.activeScript}</code>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1.5 mb-3">
        {project.status !== 'running' ? (
          <div className="relative">
            <button
              onClick={() => {
                if (project.scripts.length === 1) {
                  handleStart(project.scripts[0].name);
                } else {
                  setShowScripts(!showScripts);
                }
              }}
              disabled={!!actionLoading}
              className="btn-ghost flex items-center gap-1.5 text-dock-success text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Start
              {project.scripts.length > 1 && <ChevronDown className="w-3 h-3" />}
            </button>
            {/* Script dropdown */}
            {showScripts && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-dock-surface border border-dock-border rounded-lg shadow-xl z-20 py-1 animate-fade-in">
                {project.scripts.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => handleStart(s.name)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-dock-hover transition-colors flex items-center gap-2"
                  >
                    <Play className="w-3 h-3 text-dock-success" />
                    <span className="font-mono">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={handleStop}
              disabled={!!actionLoading}
              className="btn-ghost flex items-center gap-1.5 text-dock-danger text-xs"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
            <button
              onClick={handleRestart}
              disabled={!!actionLoading}
              className="btn-ghost flex items-center gap-1.5 text-dock-warning text-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${actionLoading === 'restart' ? 'animate-spin' : ''}`} />
              Restart
            </button>
          </>
        )}

        <button
          onClick={() => setLogsPanelProjectId(project.id)}
          className="btn-ghost flex items-center gap-1.5 text-xs ml-auto"
          title="View logs"
        >
          <ScrollText className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Deep Links */}
      <div className="flex items-center gap-1 mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={`vscode://file${project.path}`}
          className="p-1.5 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors"
          title="Open in VS Code"
        >
          <Code2 className="w-3.5 h-3.5" />
        </a>
        {project.gitRemote && (
          <a
            href={project.gitRemote}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors"
            title="Open on GitHub"
          >
            <Github className="w-3.5 h-3.5" />
          </a>
        )}
        {project.ports.length > 0 && (
          <a
            href={`http://localhost:${project.ports[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors"
            title="Open localhost"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          className="p-1.5 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors"
          title="Open in terminal"
          onClick={() => {
            // xdg-open won't work in browser, but the concept is there
            window.open(`vscode://file${project.path}`, '_blank');
          }}
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors"
          title="Open folder"
          onClick={() => window.open(`vscode://file${project.path}`, '_blank')}
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Notes */}
      <QuickNotes
        projectId={project.id}
        notes={project.notes}
        onUpdate={(notes) => updateProject(project.id, { notes })}
      />
    </div>
  );
}
