import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, AlertTriangle, Copy, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import toast from 'react-hot-toast';

export function EnvironmentPeek() {
  const { projects } = useAppStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject) {
      loadEnv(selectedProject);
    }
  }, [selectedProject]);

  const loadEnv = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/env/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setEnvVars(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const copyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const maskValue = (value: string) => {
    if (showValues) return value;
    if (value.length <= 4) return '••••';
    return value.substring(0, 2) + '•'.repeat(Math.min(value.length - 4, 20)) + value.substring(value.length - 2);
  };

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4 text-dock-accent" />
          Environment Peek
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value || null)}
            className="input text-xs h-7 w-48"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <button
              onClick={() => setShowValues(!showValues)}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              {showValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showValues ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <p className="text-xs text-dock-muted">Select a project to view its environment variables</p>
      ) : loading ? (
        <p className="text-xs text-dock-muted">Loading...</p>
      ) : Object.keys(envVars).length === 0 ? (
        <p className="text-xs text-dock-muted flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          No .env file found for this project
        </p>
      ) : (
        <div className="space-y-1">
          {Object.entries(envVars).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-dock-hover group"
            >
              <span className="text-xs font-mono font-medium text-dock-accent-light w-40 truncate">
                {key}
              </span>
              <span className="text-xs font-mono text-dock-text-dim flex-1 truncate">
                {maskValue(value)}
              </span>
              <button
                onClick={() => copyValue(key, value)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-dock-hover text-dock-muted transition-opacity"
              >
                {copiedKey === key ? (
                  <Check className="w-3 h-3 text-dock-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
