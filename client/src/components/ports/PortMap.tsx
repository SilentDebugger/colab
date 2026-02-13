import React, { useEffect, useState } from 'react';
import { Network, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';

export function PortMap() {
  const { ports, setPorts, projects } = useAppStore();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.scanPorts();
      setPorts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ports.length === 0) refresh();
  }, []);

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Network className="w-5 h-5 text-dock-accent" />
            Port Map
          </h2>
          <p className="text-sm text-dock-muted mt-1">
            Active listening ports on your machine
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {ports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-dock-muted">
          <Network className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">No listening ports detected</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-dock-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dock-card text-dock-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Port</th>
                <th className="text-left px-4 py-3 font-medium">Process</th>
                <th className="text-left px-4 py-3 font-medium">PID</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dock-border">
              {ports.map((port, idx) => {
                const project = port.projectId ? projectMap.get(port.projectId) : null;
                return (
                  <tr key={`${port.port}-${port.pid}-${idx}`} className="hover:bg-dock-hover/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-semibold">{port.port}</span>
                    </td>
                    <td className="px-4 py-2.5 text-dock-text-dim">{port.processName}</td>
                    <td className="px-4 py-2.5 font-mono text-dock-muted text-xs">{port.pid}</td>
                    <td className="px-4 py-2.5">
                      {project ? (
                        <span className="text-dock-accent-light font-medium">{project.name}</span>
                      ) : port.projectName ? (
                        <span className="text-dock-text-dim">{port.projectName}</span>
                      ) : (
                        <span className="text-dock-muted italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {port.conflict ? (
                        <span className="badge bg-dock-danger/10 text-dock-danger">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Conflict
                        </span>
                      ) : (
                        <span className="badge bg-dock-success/10 text-dock-success">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <a
                        href={`http://localhost:${port.port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-text transition-colors inline-flex"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
