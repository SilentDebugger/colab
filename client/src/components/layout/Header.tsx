import React from 'react';
import { Search, Command, RefreshCw, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface HeaderProps {
  onScan: () => void;
  scanning: boolean;
}

export function Header({ onScan, scanning }: HeaderProps) {
  const { searchQuery, setSearchQuery, setShowCommandPalette } = useAppStore();

  return (
    <header className="h-14 border-b border-dock-border bg-dock-surface/80 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 min-w-[180px]">
        <div className="w-8 h-8 bg-dock-accent rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-semibold bg-gradient-to-r from-dock-accent to-dock-accent-light bg-clip-text text-transparent">
          DevDock
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dock-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 pr-20 h-9 text-sm"
          />
          <button
            onClick={() => setShowCommandPalette(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 
                     rounded bg-dock-bg border border-dock-border text-[10px] text-dock-muted 
                     hover:text-dock-text transition-colors"
          >
            <Command className="w-3 h-3" />
            <span>K</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onScan}
          disabled={scanning}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>
    </header>
  );
}
