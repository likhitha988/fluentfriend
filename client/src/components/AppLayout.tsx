import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Home, Mic, Settings as Cog, Target, TrendingUp } from 'lucide-react';
import { Logo } from './ui';

const links = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/talk', label: 'Talk', icon: Mic },
  { to: '/app/practice', label: 'Practice', icon: Target },
  { to: '/app/vocabulary', label: 'Words', icon: BookOpen },
  { to: '/app/progress', label: 'Progress', icon: TrendingUp },
  { to: '/app/settings', label: 'Settings', icon: Cog },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Logo className="px-2 py-3 text-lg" />
        <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="Main">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} /> {label === 'Talk' ? 'Conversation' : label === 'Words' ? 'Vocabulary' : label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-8">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      >
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium ${
                isActive ? 'text-brand-600' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}