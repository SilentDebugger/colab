import React, { useState } from 'react';
import { History, X, Play, RotateCw } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export function SessionRestore() {
  const { showSessionRestore, setShowSessionRestore, projects } = useAppStore();
  const [loading, setLoading] = useState(false);

  if (!showSessionRestore) return null;

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await api.restoreSession();
      toast.success(`Restored ${result.restored}/${result.total} projects`);
      setShowSessionRestore(false);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    await api.clearSession();
    setShowSessionRestore(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="card w-[420px] animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-dock-accent/20 rounded-lg flex items-center justify-center">
              <History className="w-4 h-4 text-dock-accent" />
            </div>
            <h2 className="text-base font-semibold">Restore Previous Session</h2>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-dock-hover text-dock-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-dock-text-dim mb-4">
          You had projects running in your last session. Would you like to restore them?
        </p>

        <div className="flex gap-2">
          <button onClick={handleDismiss} className="btn-ghost flex-1">
            Dismiss
          </button>
          <button onClick={handleRestore} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
