import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Drama, Lightbulb, MessageSquareQuote, Timer } from 'lucide-react';
import { api, Catalog, CatalogItem } from '../lib/api';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold">{icon}{title}</h2>
      <p className="mb-3 text-sm text-slate-500">{hint}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Tile({ to, title, text, meta }: { to: string; title: string; text?: string; meta?: string }) {
  return (
    <Link to={to} className="card block transition hover:-translate-y-0.5 hover:border-brand-300">
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-600">{text}</p>}
      {meta && <p className="mt-2 text-xs font-medium text-brand-600">{meta}</p>}
    </Link>
  );
}

export default function Practice() {
  const [c, setC] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    api.get<Catalog>('/practice/catalog').then(setC).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!c) return <Spinner />;

  const q = (mode: string, it: CatalogItem) => `/app/talk?mode=${mode}&item=${it.id}`;

  return (
    <div>
      <PageHeader title="Practice Center" subtitle="Pick something to talk about. Every exercise is a live conversation." />

      <div className="card border-brand-200 bg-brand-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="chip bg-amber-100 text-amber-800">Daily challenge</span>
            <h2 className="mt-2 text-xl font-bold">{c.today.title}</h2>
            <p className="mt-1 text-slate-600">{c.today.prompt}</p>
            <p className="mt-2 text-sm text-slate-500">Topic of the day: <b>{c.topicOfTheDay}</b></p>
          </div>
          {c.today.completed ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><CheckCircle2 size={18} /> Completed today</span>
          ) : (
            <Link to="/app/talk?mode=challenge" className="btn-primary">Start challenge</Link>
          )}
        </div>
      </div>

      <Section icon={<Drama size={20} className="text-brand-600" />} title="Role-play" hint="The AI plays the other person. Respond as you would in real life.">
        {c.rolePlays.map((r) => <Tile key={r.id} to={q('roleplay', r)} title={r.title} text={r.blurb} />)}
      </Section>

      <Section icon={<MessageSquareQuote size={20} className="text-brand-600" />} title="Storytelling and describing" hint="Practise telling what happened, in order, with connecting words.">
        {[...c.stories, ...c.describe].map((s) => <Tile key={s.id} to={q('story', s)} title={s.title} text={s.prompt} />)}
      </Section>

      <Section icon={<Lightbulb size={20} className="text-brand-600" />} title="Share your opinion" hint="Give a reason and an example. Disagreeing politely is a skill too.">
        {c.opinions.map((o) => <Tile key={o.id} to={q('opinion', o)} title={o.title} text={o.prompt} />)}
      </Section>

      <Section icon={<Timer size={20} className="text-brand-600" />} title="Timed speaking" hint="Speak for longer each time: 30 seconds, then 1 minute, then 2 minutes. Pauses are fine.">
        {c.timed.map((t) => (
          <Tile key={t.id} to={q('timed', t)} title={t.title} text={t.prompt} meta={`Aim for ${t.seconds >= 60 ? `${t.seconds / 60} min` : `${t.seconds} sec`}`} />
        ))}
      </Section>

      <Section icon={<Clock size={20} className="text-brand-600" />} title="Free chat" hint="No script. Choose a topic or just start talking.">
        <Tile to="/app/talk?mode=free" title="Anything you like" text="Let the conversation go wherever it goes." />
        {c.topics.map((t) => <Tile key={t.id} to={q('free', t)} title={t.title} />)}
      </Section>
    </div>
  );
}
