import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useKeyboard() {
  const { setShowCommandPalette, showCommandPalette } = useAppStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K or Cmd+K — toggle command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(!showCommandPalette);
      }

      // Escape — close modals
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        useAppStore.getState().setLogsPanelProjectId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, setShowCommandPalette]);
}
