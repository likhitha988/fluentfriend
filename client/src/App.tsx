import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ConversationRoom from './pages/ConversationRoom';
import Practice from './pages/Practice';
import Vocabulary from './pages/Vocabulary';
import Progress from './pages/Progress';
import SettingsPage from './pages/SettingsPage';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Loading your account" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="talk" element={<ConversationRoom />} />
        <Route path="practice" element={<Practice />} />
        <Route path="vocabulary" element={<Vocabulary />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
