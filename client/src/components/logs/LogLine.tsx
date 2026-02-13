import React, { memo } from 'react';
import type { LogEntry } from '@devdock/shared';

interface LogLineProps {
  entry: LogEntry;
  searchTerm?: string;
  projectName?: string;
  projectColor?: string;
}

function highlightText(text: string, search: string): React.ReactNode {
  if (!search) return text;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-dock-warning/30 text-dock-warning rounded px-0.5">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  );
}

// Strip ANSI codes for display (simple approach)
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export const LogLine = memo(function LogLine({ entry, searchTerm, projectName, projectColor }: LogLineProps) {
  const isError = entry.stream === 'stderr';
  const isDevDock = entry.text.startsWith('[DevDock]');
  const cleanText = stripAnsi(entry.text);
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`flex items-start gap-2 px-3 py-0.5 font-mono text-xs leading-5 hover:bg-dock-hover/50 transition-colors ${
        isError
          ? 'bg-dock-danger/5 text-red-400'
          : isDevDock
          ? 'text-dock-accent-light italic'
          : 'text-dock-text-dim'
      }`}
    >
      <span className="text-dock-muted select-none flex-shrink-0 w-16 text-right">{time}</span>
      {projectName && (
        <span className={`select-none flex-shrink-0 w-20 text-right truncate text-[10px] ${projectColor || 'text-dock-muted'}`}>
          {projectName}
        </span>
      )}
      <span
        className={`flex-shrink-0 w-4 text-center select-none ${
          isError ? 'text-dock-danger' : 'text-dock-muted'
        }`}
      >
        {isError ? '!' : '·'}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-all">
        {searchTerm ? highlightText(cleanText, searchTerm) : cleanText}
      </span>
    </div>
  );
});
