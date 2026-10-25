import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, Settings, User } from '../lib/api';

interface AuthState {
  user: User | null;
  settings: Settings | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
      .get<{ user: User; settings: Settings }>('/auth/me')
      .then((r) => {
        setUser(r.user);
        setSettings(r.settings);
      })
      .catch((e) => {
        if (!(e instanceof ApiError) || e.status !== 401) console.warn('Could not check session');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ user: User; settings: Settings }>('/auth/login', { email, password });
    setUser(r.user);
    setSettings(r.settings);
  }, []);

  const signup = useCallback(async (displayName: string, email: string, password: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const r = await api.post<{ user: User; settings: Settings }>('/auth/register', { displayName, email, password, timezone });
    setUser(r.user);
    setSettings(r.settings);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setSettings(null);
    }
  }, []);

  return (
    <Ctx.Provider value={{ user, settings, loading, login, signup, logout, setSettings, setUser }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
