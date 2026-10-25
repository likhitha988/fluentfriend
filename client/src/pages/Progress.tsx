import { useCallback, useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api, DayStat, fmtMinutes } from '../lib/api';
import { ErrorBox, PageHeader, ProgressBar, Spinner, WeekBars } from '../components/ui';

interface ProgressData {
  totals: { speakingSeconds: number; userTurns: number; conversations: number; challengesCompleted: number; longestStreak: number; currentStreak: number };
  week: DayStat[];
  month: DayStat[];
  weekly: { speakingSeconds: number; goalSeconds: number; daysPracticed: number };
  monthly: { speakingSeconds: number; daysPracticed: number };
  vocab: { saved: number; learning: number; mastered: number; usedInConversation: number };
  areas: { category: string; count: number; label: string; tip: string }[];
  insights: string[];
  confidence: { date: string; rating: number }[];
  notes: Record<string, string>;
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="card p-4">
    <p className="text-2xl font-extrabold">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

export default function Progress() {
  const [d, setD] = useState<ProgressData | null>(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState<'week' | 'month'>('week');
  const load = useCallback(() => {
    setError('');
    api.get<ProgressData>('/progress').then(setD).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!d) return <Spinner />;

  const days = range === 'week' ? d.week : d.month;
  const maxAreas = Math.max(1, ...d.areas.map((a) => a.count));

  return (
    <div>
      <PageHeader title="Your progress" subtitle="What you have practised, and what to try next." />

      <div className="card mb-4 border-brand-200 bg-brand-50/50">
        <h2 className="font-semibold">What stands out</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          {d.insights.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total speaking time" value={fmtMinutes(d.totals.speakingSeconds)} />
        <Stat label="Conversations" value={d.totals.conversations} />
        <Stat label="Current streak" value={`${d.totals.currentStreak} d`} />
        <Stat label="Challenges done" value={d.totals.challengesCompleted} />
      </div>

      <div className="card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Speaking activity</h2>
          <div className="flex gap-1 rounded-full bg-slate-100 p-1" role="tablist">
            {(['week', 'month'] as const).map((r) => (
              <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 text-sm font-medium ${range === r ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
                {r === 'week' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div style={{ minWidth: range === 'month' ? 640 : undefined }}>
            <WeekBars days={days} />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {range === 'week'
            ? `${fmtMinutes(d.weekly.speakingSeconds)} spoken on ${d.weekly.daysPracticed} of 7 days.`
            : `${fmtMinutes(d.monthly.speakingSeconds)} spoken on ${d.monthly.daysPracticed} of the last 30 days.`}
        </p>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Weekly goal</span><span>{fmtMinutes(d.weekly.speakingSeconds)} / {fmtMinutes(d.weekly.goalSeconds)}</span></div>
          <ProgressBar value={d.weekly.speakingSeconds} max={d.weekly.goalSeconds} label="Weekly speaking goal" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Areas to focus on</h2>
          {d.areas.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing stands out yet. Keep talking and patterns will show up here.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {d.areas.map((a) => (
                <li key={a.category}>
                  <div className="flex justify-between text-sm font-medium"><span>{a.label}</span><span className="text-slate-500">{a.count}×</span></div>
                  <div className="mt-1"><ProgressBar value={a.count} max={maxAreas} label={a.label} /></div>
                  <p className="mt-1.5 text-sm text-slate-600">{a.tip}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold">Vocabulary</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-2xl font-extrabold">{d.vocab.saved}</p><p className="text-xs text-slate-500">saved</p></div>
              <div><p className="text-2xl font-extrabold">{d.vocab.mastered}</p><p className="text-xs text-slate-500">mastered in quizzes</p></div>
              <div><p className="text-2xl font-extrabold">{d.vocab.learning}</p><p className="text-xs text-slate-500">still learning</p></div>
              <div><p className="text-2xl font-extrabold">{d.vocab.usedInConversation}</p><p className="text-xs text-slate-500">used when speaking</p></div>
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold">Your confidence (self-rated)</h2>
            {d.confidence.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">After you end a conversation you can rate how confident you felt. Your ratings will appear here.</p>
            ) : (
              <div className="mt-3 flex h-20 items-end gap-1.5" role="img" aria-label="Self-rated confidence over time">
                {d.confidence.map((c) => (
                  <div key={c.date} className="flex-1 rounded-t bg-emerald-400" style={{ height: `${(c.rating / 5) * 100}%` }} title={`${c.date}: ${c.rating}/5`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-2xl bg-slate-100 p-4 text-xs text-slate-600">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p><b>About these numbers.</b> {d.notes.speakingTime}</p>
          <p>{d.notes.areas} {d.notes.confidence} {d.notes.pronunciation}</p>
        </div>
      </div>
    </div>
  );
}
