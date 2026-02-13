import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowDown, Maximize2, Minimize2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useLogSubscription } from '../../hooks/useSocket';
import { LogLine } from './LogLine';
import { LogFilter } from './LogFilter';
import type { LogEntry } from '@devdock/shared';

export function LogStreamer() {
  const { logsPanelProjectId, setLogsPanelProjectId, logs, projects, clearLogs } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLogSubscription(logsPanelProjectId);

  const projectLogs = logsPanelProjectId ? logs[logsPanelProjectId] || [] : [];
  const project = projects.find((p) => p.id === logsPanelProjectId);

  // Filter logs
  let filtered: LogEntry[] = projectLogs;
  if (streamFilter !== 'all') {
    filtered = filtered.filter((l) => l.stream === streamFilter);
  }
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter((l) => l.text.toLowerCase().includes(q));
  }

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  if (!logsPanelProjectId) return null;

  return (
    <div
      className={`fixed right-0 bottom-0 bg-dock-surface border-l border-t border-dock-border shadow-2xl z-50 flex flex-col animate-slide-in-right ${
        expanded ? 'inset-0' : 'w-[600px] h-[400px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border bg-dock-card">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{project?.name || 'Logs'}</h3>
          {project?.status === 'running' && (
            <span className="w-2 h-2 rounded-full bg-dock-success animate-pulse-slow" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-1 rounded hover:bg-dock-hover text-dock-muted"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-dock-hover text-dock-muted"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setLogsPanelProjectId(null)}
            className="p-1 rounded hover:bg-dock-hover text-dock-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter */}
      <LogFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        streamFilter={streamFilter}
        onStreamFilterChange={setStreamFilter}
        onClear={() => logsPanelProjectId && clearLogs(logsPanelProjectId)}
        logCount={filtered.length}
      />

      {/* Log content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-dock-bg"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dock-muted text-sm">
            {projectLogs.length === 0 ? 'No logs yet. Start the project to see output.' : 'No logs match your filters.'}
          </div>
        ) : (
          filtered.map((entry) => (
            <LogLine key={entry.id} entry={entry} searchTerm={searchTerm} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
