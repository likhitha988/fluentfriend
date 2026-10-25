import { Link } from 'react-router-dom';
import { BookOpen, Heart, Mic, Sparkles, Target, Volume2 } from 'lucide-react';
import { Logo } from '../components/ui';

const features = [
  { icon: Mic, title: 'Just talk', text: 'Speak out loud and get a natural reply, like chatting with a friend, not sitting in a class.' },
  { icon: Sparkles, title: 'Gentle corrections', text: 'We reply to what you mean first, then show one useful fix after. No constant interruptions.' },
  { icon: BookOpen, title: 'Words you can use', text: 'Pick up everyday words and expressions in context, save them, and practise using them.' },
  { icon: Target, title: 'Daily practice', text: 'A small speaking challenge every day, plus role-plays for real situations.' },
];

export default function Landing() {
  const cta = '/app/talk';
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo className="text-lg" />
        <nav className="flex items-center gap-2">
          <Link to="/app" className="btn-secondary">Dashboard</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-2 md:pt-16">
        <div className="animate-fadeup">
          <span className="chip bg-brand-100 text-brand-700">For people who know English but freeze when speaking</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl">
            Speak English with <span className="text-brand-600">confidence</span>, one conversation at a time.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            FluentFriend is a patient AI speaking partner. Talk about your day, practise real situations, and learn useful
            words, without the pressure of a classroom.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={cta} className="btn-primary px-7 py-3 text-base">
              <Mic size={18} /> Start speaking
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">Works best in Chrome, Edge or Safari. You can type if you prefer.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-200/40 blur-2xl" />
          <div className="card animate-floaty space-y-3 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white"><Volume2 size={22} /></div>
              <div className="flex h-8 items-end gap-1">
                {[0, 0.15, 0.3, 0.45, 0.2].map((d, i) => (
                  <span key={i} className="h-full w-1.5 origin-bottom animate-talk rounded-full bg-brand-400" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-sm">Oh, nice! What did you both do together?</div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 p-3 text-sm text-white">
              Yesterday I go to college and meet my friend.
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">More natural</p>
              <p className="mt-1 font-medium text-slate-900">Yesterday, I went to college and met my friend.</p>
              <p className="mt-1 text-slate-600">Use the past tense because you are talking about yesterday.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Built for speaking, not studying</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={20} /></div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-brand-600 px-6 py-10 text-center text-white">
          <Heart size={24} />
          <p className="max-w-xl text-lg font-medium">Mistakes are welcome here. The goal is to keep talking.</p>
          <Link to={cta} className="btn bg-white text-brand-700 hover:bg-brand-50">Start speaking</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        FluentFriend does not store voice recordings. Only the text of your conversations is saved, and you can delete it any time.
      </footer>
    </div>
  );
}