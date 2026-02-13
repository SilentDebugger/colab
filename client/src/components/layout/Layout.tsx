import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  onScan: () => void;
  scanning: boolean;
}

export function Layout({ children, onScan, scanning }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onScan={onScan} scanning={scanning} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
