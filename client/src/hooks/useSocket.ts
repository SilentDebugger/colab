import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useAppStore } from '../stores/appStore';

export function useSocket() {
  const initialized = useRef(false);
  const { updateProject, appendLog, setPorts, updateResource } = useAppStore();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on('project:status', ({ projectId, status, pid }) => {
      useAppStore.getState().updateProject(projectId, { status, pid });
    });

    socket.on('project:log', (entry) => {
      useAppStore.getState().appendLog(entry);
    });

    socket.on('project:health', ({ projectId, status }) => {
      useAppStore.getState().updateProject(projectId, { healthStatus: status });
    });

    socket.on('project:resource', (usage) => {
      useAppStore.getState().updateResource(usage);
      useAppStore.getState().updateProject(usage.projectId, {
        cpu: usage.cpu,
        memory: usage.memory,
      });
    });

    socket.on('ports:update', (ports) => {
      useAppStore.getState().setPorts(ports);
    });

    return () => {
      socket.off('project:status');
      socket.off('project:log');
      socket.off('project:health');
      socket.off('project:resource');
      socket.off('ports:update');
    };
  }, []);
}

export function useLogSubscription(projectId: string | null) {
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    socket.emit('logs:subscribe', projectId);
    return () => {
      socket.emit('logs:unsubscribe', projectId);
    };
  }, [projectId]);
}
