import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, Settings, User } from '../lib/api';

interface AuthState {
  user: User | null;
  settings: Settings | null;
  loading: boolean;
  setSettings: (s: Settings) => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User; settings: Settings }>('/settings')
      .then((r) => {
        setUser(r.user);
        setSettings(r.settings);
      })
      .catch(() => console.warn('Could not reach the server'))
      .finally(() => setLoading(false));
  }, []);

  return <Ctx.Provider value={{ user, settings, loading, setSettings, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}