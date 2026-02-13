import React, { useState, useRef, useEffect } from 'react';
import { StickyNote, Check, X } from 'lucide-react';
import { api } from '../../lib/api';

interface QuickNotesProps {
  projectId: string;
  notes: string;
  onUpdate: (notes: string) => void;
}

export function QuickNotes({ projectId, notes, onUpdate }: QuickNotesProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const save = async () => {
    try {
      await api.updateNotes(projectId, draft);
      onUpdate(draft);
      setEditing(false);
    } catch {
      // ignore
    }
  };

  const cancel = () => {
    setDraft(notes);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(notes); setEditing(true); }}
        className="w-full text-left group"
      >
        {notes ? (
          <p className="text-xs text-dock-text-dim line-clamp-2 group-hover:text-dock-text transition-colors">
            {notes}
          </p>
        ) : (
          <p className="text-xs text-dock-muted flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <StickyNote className="w-3 h-3" />
            Add a note...
          </p>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g., needs Node 18, run migrations first..."
        className="input text-xs h-16 resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
          if (e.key === 'Escape') cancel();
        }}
      />
      <div className="flex gap-1 justify-end">
        <button onClick={cancel} className="p-1 rounded hover:bg-dock-hover text-dock-muted">
          <X className="w-3 h-3" />
        </button>
        <button onClick={save} className="p-1 rounded hover:bg-dock-accent/20 text-dock-accent">
          <Check className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
