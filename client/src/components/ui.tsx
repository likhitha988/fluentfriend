import { ReactNode } from 'react';
import { AlertCircle, Loader2, MessageCircle } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-slate-900 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">
        <MessageCircle size={18} />
      </span>
      FluentFriend
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500" role="status">
      <Loader2 className="animate-spin" size={20} /> <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
      <div className="text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-800">{title}</p>
      {children && <div className="max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function WeekBars({ days, goalSeconds }: { days: { date: string; speakingSeconds: number; userTurns: number }[]; goalSeconds?: number }) {
  const max = Math.max(goalSeconds ?? 0, ...days.map((d) => d.speakingSeconds), 60);
  const label = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
  return (
    <div className="flex h-36 items-end gap-2" role="img" aria-label="Speaking minutes for each of the last days">
      {days.map((d) => {
        const active = d.userTurns > 0;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-24 w-full items-end">
              <div
                className={`w-full rounded-t-lg ${active ? 'bg-brand-500' : 'bg-slate-200'}`}
                style={{ height: `${Math.max(active ? 8 : 4, (d.speakingSeconds / max) * 100)}%` }}
                title={`${Math.round(d.speakingSeconds / 60)} min, ${d.userTurns} turns`}
              />
            </div>
            <span className="text-[11px] text-slate-500">{label(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
