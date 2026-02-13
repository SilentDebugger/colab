import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ScrollText, ArrowDown, Layers } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLogSubscription } from '../../hooks/useSocket';
import { LogLine } from './LogLine';
import { LogFilter } from './LogFilter';
import type { LogEntry } from '@devdock/shared';

const PROJECT_COLORS = [
  'text-indigo-400',
  'text-emerald-400',
  'text-amber-400',
  'text-rose-400',
  'text-cyan-400',
  'text-violet-400',
  'text-lime-400',
  'text-fuchsia-400',
];

export function LogsPage() {
  const { projects, logs, clearLogs } = useAppStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to selected project or all running projects in multi mode
  const projectsWithLogs = projects.filter(
    (p) => p.status === 'running' || (logs[p.id] && logs[p.id].length > 0)
  );

  // In multi mode, subscribe to all running projects
  useLogSubscription(multiMode ? null : selectedProject);
  // We need individual subscriptions for multi mode — handled via multiple effects below

  const runningProjects = projects.filter((p) => p.status === 'running');

  // Auto-select first running project
  useEffect(() => {
    if (!selectedProject && !multiMode && runningProjects.length > 0) {
      setSelectedProject(runningProjects[0].id);
    }
  }, [runningProjects.length]);

  // Build the color map for multi-project mode
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    projectsWithLogs.forEach((p, i) => {
      map.set(p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]);
    });
    return map;
  }, [projectsWithLogs]);

  // Build the name map
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  // Get logs for display
  const displayLogs: (LogEntry & { _projectColor?: string; _projectName?: string })[] = useMemo(() => {
    if (multiMode) {
      // Interleave logs from all projects
      const allEntries: (LogEntry & { _projectColor?: string; _projectName?: string })[] = [];
      for (const p of projectsWithLogs) {
        const pLogs = logs[p.id] || [];
        for (const entry of pLogs) {
          allEntries.push({
            ...entry,
            _projectColor: colorMap.get(p.id),
            _projectName: nameMap.get(p.id),
          });
        }
      }
      // Sort by timestamp for true interleaving
      allEntries.sort((a, b) => a.timestamp - b.timestamp);
      return allEntries;
    } else {
      return selectedProject ? logs[selectedProject] || [] : [];
    }
  }, [multiMode, selectedProject, logs, projectsWithLogs, colorMap, nameMap]);

  // Apply filters
  let filtered = displayLogs;
  if (streamFilter !== 'all') {
    filtered = filtered.filter((l) => l.stream === streamFilter);
  }
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter((l) => l.text.toLowerCase().includes(q));
  }

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const handleClear = () => {
    if (multiMode) {
      for (const p of projectsWithLogs) clearLogs(p.id);
    } else if (selectedProject) {
      clearLogs(selectedProject);
    }
  };

  return (
    <div className="h-full flex flex-col -m-6">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-dock-border bg-dock-surface/50">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-dock-accent" />
          Logs
        </h2>

        {/* Multi-project toggle */}
        <button
          onClick={() => setMultiMode(!multiMode)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
            multiMode
              ? 'bg-dock-accent/15 text-dock-accent-light'
              : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover'
          }`}
          title="Interleave logs from all projects"
        >
          <Layers className="w-3 h-3" />
          All
        </button>

        {!multiMode && (
          <div className="flex gap-1 ml-2">
            {projectsWithLogs.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                  selectedProject === p.id
                    ? 'bg-dock-accent/15 text-dock-accent-light'
                    : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover'
                }`}
              >
                {p.name}
                {p.status === 'running' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-dock-success inline-block" />
                )}
              </button>
            ))}
          </div>
        )}

        {multiMode && (
          <div className="flex gap-2 ml-2">
            {projectsWithLogs.map((p, i) => (
              <span key={p.id} className={`text-[10px] font-medium ${colorMap.get(p.id)}`}>
                ● {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <LogFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        streamFilter={streamFilter}
        onStreamFilterChange={setStreamFilter}
        onClear={handleClear}
        logCount={filtered.length}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-dock-bg"
      >
        {!multiMode && !selectedProject ? (
          <div className="flex items-center justify-center h-full text-dock-muted text-sm">
            Select a project to view its logs
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dock-muted text-sm">
            {displayLogs.length === 0 ? 'No logs yet. Start a project to see output.' : 'No logs match your filters.'}
          </div>
        ) : (
          filtered.map((entry) => (
            <LogLine
              key={entry.id}
              entry={entry}
              searchTerm={searchTerm}
              projectName={multiMode ? (entry as any)._projectName : undefined}
              projectColor={multiMode ? (entry as any)._projectColor : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-4 right-4 p-2 rounded-full bg-dock-accent text-white shadow-lg hover:bg-dock-accent-light transition-colors"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
