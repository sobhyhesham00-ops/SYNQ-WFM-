import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { AgentView } from './components/AgentView';
import { TeamLeaderView } from './components/TeamLeaderView';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { wsClient } from './lib/wsClient';

function MainApp() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleNotification = (data: { targetUserId: string; message: string; type: 'success' | 'error' | 'info' }) => {
      // Only show toast if the current user is the target, OR if target is 'all' (for demonstration)
      if (data.targetUserId === user.id || data.targetUserId === 'all') {
        if (data.type === 'success') toast.success(data.message);
        else if (data.type === 'error') toast.error(data.message);
        else toast(data.message);
      }
    };

    wsClient.on('notification', handleNotification);

    return () => {
      wsClient.off('notification', handleNotification);
    };
  }, [user]);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />
      
      <main className="flex-1 overflow-hidden flex flex-col p-6">
        {user.role === 'AGENT' ? (
          <AgentView currentUserId={user.id} />
        ) : (
          <TeamLeaderView />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <Toaster position="top-right" />
        <MainApp />
      </ScheduleProvider>
    </AuthProvider>
  );
}
