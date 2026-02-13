import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollText, ArrowDown } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLogSubscription } from '../../hooks/useSocket';
import { LogLine } from './LogLine';
import { LogFilter } from './LogFilter';
import type { LogEntry } from '@devdock/shared';

export function LogsPage() {
  const { projects, logs, clearLogs } = useAppStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLogSubscription(selectedProject);

  const runningProjects = projects.filter((p) => p.status === 'running');

  // Auto-select first running project
  useEffect(() => {
    if (!selectedProject && runningProjects.length > 0) {
      setSelectedProject(runningProjects[0].id);
    }
  }, [runningProjects.length]);

  const projectLogs = selectedProject ? logs[selectedProject] || [] : [];

  let filtered: LogEntry[] = projectLogs;
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

  return (
    <div className="h-full flex flex-col -m-6">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-dock-border bg-dock-surface/50">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-dock-accent" />
          Logs
        </h2>
        <div className="flex gap-1 ml-4">
          {projects
            .filter((p) => p.status === 'running' || (logs[p.id] && logs[p.id].length > 0))
            .map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  selectedProject === p.id
                    ? 'bg-dock-accent/15 text-dock-accent-light'
                    : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover'
                }`}
              >
                {p.name}
                {p.status === 'running' && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-dock-success inline-block" />
                )}
              </button>
            ))}
        </div>
      </div>

      <LogFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        streamFilter={streamFilter}
        onStreamFilterChange={setStreamFilter}
        onClear={() => selectedProject && clearLogs(selectedProject)}
        logCount={filtered.length}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-dock-bg"
      >
        {!selectedProject ? (
          <div className="flex items-center justify-center h-full text-dock-muted text-sm">
            Select a project to view its logs
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dock-muted text-sm">
            {projectLogs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
          </div>
        ) : (
          filtered.map((entry) => (
            <LogLine key={entry.id} entry={entry} searchTerm={searchTerm} />
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
