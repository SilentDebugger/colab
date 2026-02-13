import React from 'react';
import { Cpu, HardDrive, Activity } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function ResourceMonitor() {
  const { projects, resources } = useAppStore();
  const runningProjects = projects.filter((p) => p.status === 'running');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  if (runningProjects.length === 0) {
    return null;
  }

  return (
    <div className="card mt-6">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-dock-accent" />
        Resource Monitor
      </h3>
      <div className="space-y-2">
        {runningProjects.map((project) => {
          const usage = resources[project.id];
          if (!usage) return null;

          const cpuPct = Math.min(usage.cpu, 100);
          const memMB = usage.memory / 1048576;

          return (
            <div key={project.id} className="flex items-center gap-3 py-1.5">
              <span className="text-xs font-medium w-32 truncate" title={project.name}>
                {project.name}
              </span>
              <div className="flex-1 flex items-center gap-4">
                {/* CPU */}
                <div className="flex items-center gap-2 flex-1">
                  <Cpu className="w-3 h-3 text-dock-muted flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-dock-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cpuPct > 80 ? 'bg-dock-danger' : cpuPct > 50 ? 'bg-dock-warning' : 'bg-dock-accent'
                      }`}
                      style={{ width: `${Math.max(cpuPct, 1)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-dock-muted w-12 text-right">
                    {cpuPct.toFixed(1)}%
                  </span>
                </div>
                {/* Memory */}
                <div className="flex items-center gap-2 w-32">
                  <HardDrive className="w-3 h-3 text-dock-muted flex-shrink-0" />
                  <span className="text-[10px] text-dock-muted">
                    {formatBytes(usage.memory)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
