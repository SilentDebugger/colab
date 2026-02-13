import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { ProjectGrid } from './components/dashboard/ProjectGrid';
import { LogStreamer } from './components/logs/LogStreamer';
import { LogsPage } from './components/logs/LogsPage';
import { PortMap } from './components/ports/PortMap';
import { GroupManager } from './components/groups/GroupManager';
import { SettingsPage } from './components/settings/SettingsPage';
import { SessionRestore } from './components/session/SessionRestore';
import { CommandPalette } from './components/common/CommandPalette';
import { useSocket } from './hooks/useSocket';
import { useProjects } from './hooks/useProjects';
import { useKeyboard } from './hooks/useKeyboard';
import { useAppStore } from './stores/appStore';

export function App() {
  const { currentPage } = useAppStore();
  const { projects, loading, scanProjects } = useProjects();
  const [scanning, setScanning] = useState(false);

  useSocket();
  useKeyboard();

  const handleScan = async () => {
    setScanning(true);
    await scanProjects();
    setScanning(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ProjectGrid projects={projects} loading={loading} onScan={handleScan} />;
      case 'logs':
        return <LogsPage />;
      case 'ports':
        return <PortMap />;
      case 'groups':
        return <GroupManager />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ProjectGrid projects={projects} loading={loading} onScan={handleScan} />;
    }
  };

  return (
    <>
      <Layout onScan={handleScan} scanning={scanning}>
        {renderPage()}
      </Layout>

      {/* Overlays */}
      <LogStreamer />
      <SessionRestore />
      <CommandPalette />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '!bg-dock-card !text-dock-text !border !border-dock-border !shadow-xl',
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid #2a2a3e',
          },
        }}
      />
    </>
  );
}
