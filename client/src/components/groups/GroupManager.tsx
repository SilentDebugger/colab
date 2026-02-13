import React, { useState } from 'react';
import { FolderKanban, Plus, Play, Square, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export function GroupManager() {
  const { groups, setGroups, projects } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!newName || selectedProjectIds.length === 0) {
      toast.error('Name and at least one project required');
      return;
    }
    try {
      const group = await api.createGroup(newName, selectedProjectIds, newDescription);
      setGroups([...groups, group]);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setSelectedProjectIds([]);
      toast.success(`Group "${newName}" created`);
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteGroup(id);
      setGroups(groups.filter((g) => g.id !== id));
      toast.success('Group deleted');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  const handleStartGroup = async (id: string) => {
    try {
      await api.startGroup(id);
      toast.success('Group started');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  const handleStopGroup = async (id: string) => {
    try {
      await api.stopGroup(id);
      toast.success('Group stopped');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-dock-accent" />
            Project Groups
          </h2>
          <p className="text-sm text-dock-muted mt-1">
            Launch entire stacks with one click
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Create Group</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-dock-hover text-dock-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name (e.g., Full Stack)"
              className="input text-sm"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="input text-sm"
            />
            <div>
              <p className="text-xs text-dock-muted mb-2">Select projects:</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      selectedProjectIds.includes(p.id)
                        ? 'border-dock-accent bg-dock-accent/10 text-dock-accent-light'
                        : 'border-dock-border hover:border-dock-accent/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="sr-only"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleCreate} className="btn-primary w-full">
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      {groups.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center h-48 text-dock-muted">
          <FolderKanban className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">No groups yet. Create one to launch multiple projects at once.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupProjects = projects.filter((p) => group.projectIds.includes(p.id));
            const running = groupProjects.filter((p) => p.status === 'running').length;
            return (
              <div key={group.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-dock-muted">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-dock-muted">
                      {running}/{groupProjects.length} running
                    </span>
                    <button
                      onClick={() => handleStartGroup(group.id)}
                      className="btn-ghost text-dock-success text-xs flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Start All
                    </button>
                    <button
                      onClick={() => handleStopGroup(group.id)}
                      className="btn-ghost text-dock-danger text-xs flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" /> Stop All
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1 rounded hover:bg-dock-hover text-dock-muted hover:text-dock-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {groupProjects.map((p) => (
                    <span
                      key={p.id}
                      className={`badge ${
                        p.status === 'running'
                          ? 'bg-dock-success/10 text-dock-success'
                          : 'bg-dock-muted/10 text-dock-muted'
                      }`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
