import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import { setApiUrl } from './lib/api';

interface AuthData {
  token: string;
  user: { id: string; email: string; name: string; role: string };
  company: { id: string; name: string; slug: string };
}

export default function App() {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      if (window.electronAPI) {
        const stored = await window.electronAPI.storeGet('auth') as AuthData | undefined;
        const serverUrl = await window.electronAPI.storeGet('serverUrl') as string | undefined;
        if (serverUrl) setApiUrl(serverUrl);
        if (stored) setAuth(stored);
      } else {
        const stored = localStorage.getItem('tpv_auth');
        if (stored) {
          try { setAuth(JSON.parse(stored)); } catch { /* ignore */ }
        }
      }
      setLoading(false);
    }
    loadAuth();
  }, []);

  const handleLogin = async (data: AuthData, serverUrl: string) => {
    setAuth(data);
    setApiUrl(serverUrl);
    if (window.electronAPI) {
      await window.electronAPI.storeSet('auth', data);
      await window.electronAPI.storeSet('serverUrl', serverUrl);
    } else {
      localStorage.setItem('tpv_auth', JSON.stringify(data));
      localStorage.setItem('tpv_serverUrl', serverUrl);
    }
  };

  const handleLogout = async () => {
    setAuth(null);
    if (window.electronAPI) {
      await window.electronAPI.storeDelete('auth');
    } else {
      localStorage.removeItem('tpv_auth');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <>
      {auth ? (
        <MainScreen auth={auth} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
      <Toaster position="top-right" />
    </>
  );
}
