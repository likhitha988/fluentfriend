import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ConversationRoom from './pages/ConversationRoom';
import Practice from './pages/Practice';
import Vocabulary from './pages/Vocabulary';
import Progress from './pages/Progress';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
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