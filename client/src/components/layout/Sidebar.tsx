import React from 'react';
import {
  LayoutDashboard,
  Network,
  FolderKanban,
  Settings,
  ScrollText,
  Activity,
} from 'lucide-react';
import { useAppStore, type ViewPage } from '../../stores/appStore';

const navItems: { page: ViewPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'logs', label: 'Logs', icon: ScrollText },
  { page: 'ports', label: 'Port Map', icon: Network },
  { page: 'groups', label: 'Groups', icon: FolderKanban },
  { page: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentPage, setPage, projects } = useAppStore();

  const running = projects.filter((p) => p.status === 'running').length;
  const crashed = projects.filter((p) => p.status === 'crashed').length;

  return (
    <aside className="w-56 border-r border-dock-border bg-dock-surface/50 flex flex-col">
      {/* Stats */}
      <div className="p-4 border-b border-dock-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold">{projects.length}</div>
            <div className="text-[10px] text-dock-muted uppercase tracking-wider">Total</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-dock-success">{running}</div>
            <div className="text-[10px] text-dock-muted uppercase tracking-wider">Running</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-dock-danger">{crashed}</div>
            <div className="text-[10px] text-dock-muted uppercase tracking-wider">Crashed</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => setPage(page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${
                currentPage === page
                  ? 'bg-dock-accent/10 text-dock-accent-light border border-dock-accent/20'
                  : 'text-dock-text-dim hover:bg-dock-hover hover:text-dock-text border border-transparent'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dock-border">
        <div className="flex items-center gap-2 text-xs text-dock-muted">
          <Activity className="w-3 h-3" />
          <span>DevDock v1.0</span>
        </div>
      </div>
    </aside>
  );
}
