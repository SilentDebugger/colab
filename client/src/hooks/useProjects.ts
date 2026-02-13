import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import toast from 'react-hot-toast';

export function useProjects() {
  const { projects, setProjects, setGroups, setSettings, setShowSessionRestore } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch {
      // Projects not loaded yet — need to scan
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  const scanProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.scanProjects();
      setProjects(data);
      toast.success(`Found ${data.length} projects`);
    } catch (err) {
      toast.error(`Scan failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  const loadAll = useCallback(async () => {
    try {
      const [projectData, groupData, settingsData, sessionData] = await Promise.allSettled([
        api.getProjects(),
        api.getGroups(),
        api.getSettings(),
        api.getSession(),
      ]);

      if (projectData.status === 'fulfilled') setProjects(projectData.value);
      if (groupData.status === 'fulfilled') setGroups(groupData.value);
      if (settingsData.status === 'fulfilled') setSettings(settingsData.value);
      if (
        sessionData.status === 'fulfilled' &&
        sessionData.value &&
        sessionData.value.projects.length > 0
      ) {
        setShowSessionRestore(true);
      }
    } catch {
      // Ignore — individual failures handled above
    } finally {
      setLoading(false);
    }
  }, [setProjects, setGroups, setSettings, setShowSessionRestore]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { projects, loading, scanProjects, loadProjects, loadAll };
}
