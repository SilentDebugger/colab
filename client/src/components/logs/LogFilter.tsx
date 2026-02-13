import React from 'react';
import { Search, Trash2, AlertTriangle, FileText } from 'lucide-react';

interface LogFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  streamFilter: 'all' | 'stdout' | 'stderr';
  onStreamFilterChange: (filter: 'all' | 'stdout' | 'stderr') => void;
  onClear: () => void;
  logCount: number;
}

export function LogFilter({
  searchTerm,
  onSearchChange,
  streamFilter,
  onStreamFilterChange,
  onClear,
  logCount,
}: LogFilterProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-dock-border bg-dock-surface/50">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dock-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs..."
          className="input text-xs h-7 pl-8"
        />
      </div>

      <div className="flex gap-0.5 rounded-lg bg-dock-bg p-0.5">
        {(['all', 'stdout', 'stderr'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onStreamFilterChange(f)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-md transition-colors ${
              streamFilter === f
                ? 'bg-dock-card text-dock-text'
                : 'text-dock-muted hover:text-dock-text'
            }`}
          >
            {f === 'stderr' && <AlertTriangle className="w-3 h-3" />}
            {f === 'stdout' && <FileText className="w-3 h-3" />}
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <span className="text-[10px] text-dock-muted ml-auto">{logCount} lines</span>

      <button
        onClick={onClear}
        className="p-1 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-danger transition-colors"
        title="Clear logs"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
