import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Flame, Mic, Sparkles } from 'lucide-react';
import { api, Challenge, CatalogItem, DayStat, Word, fmtMinutes } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorBox, ProgressBar, Spinner, WeekBars } from '../components/ui';

interface DashboardData {
  aiConfigured: boolean;
  challenge: Challenge;
  topicOfTheDay: string;
  questionOfTheDay: string;
  currentStreak: number;
  practicedToday: boolean;
  todaySpeakingSeconds: number;
  dailyGoalMinutes: number;
  week: DayStat[];
  recentWords: Word[];
  suggestedTopics: CatalogItem[];
  latestConfidence: { rating: number; date: string } | null;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.get<DashboardData>('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;

  const goalSec = data.dailyGoalMinutes * 60;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{greeting()}, {user?.displayName} 👋</h1>
          <p className="mt-1 text-slate-500">{data.questionOfTheDay}</p>
        </div>
        <button onClick={() => nav('/app/talk')} className="btn-primary px-6 py-3 text-base">
          <Mic size={18} /> Start conversation
        </button>
      </div>

      {!data.aiConfigured && (
        <ErrorBox message="The AI is not configured on the server yet. Add your API key to server/.env (see the README), then restart the server." />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="chip bg-amber-100 text-amber-800">Today's challenge</span>
            {data.challenge.completed && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} /> Completed
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold">{data.challenge.title}</h2>
          <p className="mt-1 text-slate-600">{data.challenge.prompt}</p>
          <p className="mt-2 text-xs text-slate-500">Keep the conversation going for 3 replies to complete it. Topic of the day: {data.topicOfTheDay}.</p>
          <Link to="/app/talk?mode=challenge" className="btn-primary mt-4">
            {data.challenge.completed ? 'Talk about it again' : 'Take the challenge'}
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-slate-500"><Flame size={18} className="text-orange-500" /> Practice streak</div>
          <p className="mt-2 text-4xl font-extrabold">{data.currentStreak}<span className="ml-1 text-lg font-semibold text-slate-400">{data.currentStreak === 1 ? 'day' : 'days'}</span></p>
          <p className="mt-1 text-sm text-slate-500">{data.practicedToday ? 'You practised today. Nice.' : 'Practise today to keep it going.'}</p>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-500">
              <span>Today's speaking</span>
              <span>{fmtMinutes(data.todaySpeakingSeconds)} / {data.dailyGoalMinutes} min</span>
            </div>
            <ProgressBar value={data.todaySpeakingSeconds} max={goalSec} label="Daily speaking goal" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">This week</h2>
          <p className="mb-3 text-xs text-slate-500">Speaking time from your voice turns</p>
          <WeekBars days={data.week} goalSeconds={goalSec} />
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recently learned words</h2>
            <Link to="/app/vocabulary" className="text-sm font-medium text-brand-600">See all</Link>
          </div>
          {data.recentWords.length === 0 ? (
            <div className="mt-3"><Empty icon={<BookOpen />} title="No saved words yet">Words you save in conversations will show up here.</Empty></div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.recentWords.map((w) => (
                <li key={w.id} className="py-2.5">
                  <p className="font-semibold">{w.word} <span className="text-xs font-normal text-slate-400">{w.pronunciation}</span></p>
                  <p className="text-sm text-slate-600">{w.meaning}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-brand-500" /> Suggested topics</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.suggestedTopics.map((t) => (
            <Link key={t.id} to={`/app/talk?mode=free&item=${t.id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:border-brand-300 hover:bg-brand-50">
              {t.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
