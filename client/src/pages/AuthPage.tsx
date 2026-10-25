import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, login, signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/app" replace />;
  const isSignup = mode === 'signup';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSignup && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (isSignup) await signup(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      nav(loc.state?.from ?? '/app', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center"><Logo className="text-xl" /></Link>
        <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8" noValidate>
          <div>
            <h1 className="text-2xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSignup ? 'It takes less than a minute.' : 'Log in to keep practising.'}
            </p>
          </div>
          {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          {isSignup && (
            <div>
              <label className="label" htmlFor="name">What should we call you?</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="given-name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isSignup ? 8 : undefined}
              maxLength={72}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            {isSignup && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
          </div>
          <button className="btn-primary w-full py-3" disabled={busy || !email || !password || (isSignup && !name.trim())}>
            {busy && <Loader2 className="animate-spin" size={16} />} {isSignup ? 'Sign up' : 'Log in'}
          </button>
          <p className="text-center text-sm text-slate-600">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <Link className="font-semibold text-brand-600 hover:underline" to={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
