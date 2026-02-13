import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Save } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const [dirs, setDirs] = useState<string[]>(settings?.scanDirectories || []);
  const [newDir, setNewDir] = useState('');
  const [depth, setDepth] = useState(settings?.scanDepth || 2);
  const [editor, setEditor] = useState(settings?.editorCommand || 'code');

  useEffect(() => {
    if (settings) {
      setDirs(settings.scanDirectories);
      setDepth(settings.scanDepth);
      setEditor(settings.editorCommand);
    }
  }, [settings]);

  const addDir = () => {
    if (newDir && !dirs.includes(newDir)) {
      setDirs([...dirs, newDir]);
      setNewDir('');
    }
  };

  const removeDir = (dir: string) => {
    setDirs(dirs.filter((d) => d !== dir));
  };

  const handleSave = async () => {
    try {
      const updated = await api.updateSettings({
        scanDirectories: dirs,
        scanDepth: depth,
        editorCommand: editor,
      });
      setSettings(updated);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-dock-accent" />
          Settings
        </h2>
        <p className="text-sm text-dock-muted mt-1">Configure DevDock to find your projects</p>
      </div>

      <div className="space-y-6">
        {/* Scan Directories */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Scan Directories</h3>
          <p className="text-xs text-dock-muted mb-3">
            DevDock will search these directories for projects with package.json, Makefile, docker-compose.yml, or .devdock.yml
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDir}
              onChange={(e) => setNewDir(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDir()}
              placeholder="/home/user/projects"
              className="input text-sm flex-1"
            />
            <button onClick={addDir} className="btn-primary flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {dirs.length === 0 ? (
            <p className="text-xs text-dock-muted italic">
              No directories configured. Add directories where your projects live.
            </p>
          ) : (
            <div className="space-y-1.5">
              {dirs.map((dir) => (
                <div
                  key={dir}
                  className="flex items-center justify-between px-3 py-2 bg-dock-bg rounded-lg"
                >
                  <span className="text-sm font-mono">{dir}</span>
                  <button
                    onClick={() => removeDir(dir)}
                    className="p-1 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-danger transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scan Depth */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Scan Depth</h3>
          <p className="text-xs text-dock-muted mb-3">
            How many directory levels deep to search for projects
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value))}
              className="flex-1 accent-dock-accent"
            />
            <span className="text-sm font-mono w-8 text-center">{depth}</span>
          </div>
        </div>

        {/* Editor Command */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Editor Command</h3>
          <p className="text-xs text-dock-muted mb-3">
            Command to open projects in your editor (e.g., code, cursor, vim)
          </p>
          <input
            type="text"
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            placeholder="code"
            className="input text-sm"
          />
        </div>

        {/* Save */}
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
