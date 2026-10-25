import { FormEvent, useEffect, useState } from 'react';
import { Download, Loader2, Trash2, Volume2 } from 'lucide-react';
import { api, authHeaders, Settings } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { speechInput, speechOutput } from '../lib/speech';
import { ErrorBox, PageHeader } from '../components/ui';

const LANGS = [
  ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['en-IN', 'English (India)'], ['en-AU', 'English (Australia)'],
  ['en-CA', 'English (Canada)'], ['en-ZA', 'English (South Africa)'],
];

export default function SettingsPage() {
  const { user, settings, setSettings, setUser } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [s, setS] = useState<Settings | null>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    speechOutput.getVoices().then((v) => setVoices(v.filter((x) => x.lang.toLowerCase().startsWith('en'))));
  }, []);
  if (!s) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => (p ? { ...p, [k]: v } : p));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.patch<{ user: typeof user; settings: Settings }>('/settings', { ...s, displayName: name.trim() || undefined });
      setSettings(r.settings);
      if (r.user) setUser(r.user);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const testVoice = () =>
    void speechOutput.speak('Hi! This is how I will sound when we talk.', { voiceURI: s.voiceURI, rate: s.speechRate, lang: s.recognitionLang });

  const wrap = async (fn: () => Promise<void>) => {
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };

  const clearHistory = () =>
    wrap(async () => {
      if (!window.confirm('Delete all your saved conversations? Your words and progress totals stay.')) return;
      await api.del('/conversations');
      setMsg({ ok: true, text: 'Conversation history deleted.' });
    });

  const exportData = () =>
    wrap(async () => {
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/account/export`, { headers: authHeaders() });
      if (!r.ok) throw new Error('Could not export your data.');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fluentfriend-data.json';
      a.click();
      URL.revokeObjectURL(url);
    });

  const deleteAccount = () =>
    wrap(async () => {
      if (!window.confirm('Delete all your data on this device and start fresh?')) return;
      await api.del('/account');
      try { localStorage.removeItem('ff_guest'); } catch { /* ignore */ }
      window.location.href = '/';
    });

  const Radio = ({ name: n, value, options }: { name: keyof Settings; value: string; options: [string, string, string][] }) => (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
      {options.map(([v, label, hint]) => (
        <button
          type="button"
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => set(n, v as never)}
          className={`rounded-xl border p-3 text-left text-sm transition ${value === v ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <p className="font-semibold">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile and settings" />
      <form onSubmit={save} className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <div>
            <label className="label" htmlFor="dn">Display name</label>
            <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Conversation</h2>
          <div>
            <p className="label">Difficulty</p>
            <Radio name="difficulty" value={s.difficulty} options={[
              ['comfortable', 'Comfortable', 'Simple words, short sentences'],
              ['balanced', 'Balanced', 'Natural everyday English'],
              ['challenging', 'Challenging', 'Richer words and longer answers'],
            ]} />
          </div>
          <div>
            <p className="label">Correction style</p>
            <Radio name="correctionStyle" value={s.correctionStyle} options={[
              ['gentle', 'Gentle', 'Only the mistakes that matter most'],
              ['balanced', 'Balanced', 'One useful fix now and then'],
              ['detailed', 'Detailed', 'A fix and explanation when needed'],
            ]} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span><span className="font-medium">Keep listening after the AI speaks</span><span className="block text-sm text-slate-500">Turns the mic on automatically so the conversation flows.</span></span>
            <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={s.autoListen} onChange={(e) => set('autoListen', e.target.checked)} />
          </label>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Voice</h2>
          <div>
            <label className="label" htmlFor="lang">Your accent for speech recognition</label>
            <select id="lang" className="input" value={s.recognitionLang} onChange={(e) => set('recognitionLang', e.target.value)}>
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {!speechInput.supported && <p className="mt-1 text-sm text-amber-700">This browser does not support voice input. You can still type.</p>}
          </div>
          <div>
            <label className="label" htmlFor="voice">AI voice</label>
            <select id="voice" className="input" value={s.voiceURI} onChange={(e) => set('voiceURI', e.target.value)}>
              <option value="">Browser default</option>
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Available voices depend on your device and browser.</p>
          </div>
          <div>
            <label className="label" htmlFor="rate">Speaking speed: {s.speechRate.toFixed(1)}×</label>
            <input id="rate" type="range" min={0.6} max={1.3} step={0.1} value={s.speechRate} onChange={(e) => set('speechRate', Number(e.target.value))} className="w-full accent-brand-600" />
          </div>
          <button type="button" className="btn-secondary" onClick={testVoice}><Volume2 size={16} /> Test voice</button>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Goals and reminders</h2>
          <div>
            <label className="label" htmlFor="goal">Daily speaking goal (minutes)</label>
            <input id="goal" type="number" min={1} max={120} className="input max-w-[140px]" value={s.dailyGoalMinutes} onChange={(e) => set('dailyGoalMinutes', Math.max(1, Math.min(120, Number(e.target.value) || 1)))} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span><span className="font-medium">Daily reminder</span><span className="block text-sm text-slate-500">Saved as a preference. Push and email reminders are not sent yet.</span></span>
            <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={s.dailyReminder} onChange={(e) => set('dailyReminder', e.target.checked)} />
          </label>
          {s.dailyReminder && (
            <div>
              <label className="label" htmlFor="rt">Reminder time</label>
              <input id="rt" type="time" className="input max-w-[160px]" value={s.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
            </div>
          )}
        </section>

        {msg && (msg.ok ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg.text}</p> : <ErrorBox message={msg.text} />)}
        <button className="btn-primary px-8" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save changes</button>
      </form>

      <section className="card mt-8 space-y-4 border-rose-200">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-slate-600">FluentFriend stores the text of your conversations, your saved words and your progress. It never stores voice recordings.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportData}><Download size={16} /> Download my data</button>
          <button className="btn-secondary" onClick={clearHistory}><Trash2 size={16} /> Delete conversation history</button>
          <button className="btn-secondary text-rose-600" onClick={deleteAccount}>Reset all my data</button>
        </div>
      </section>
    </div>
  );
}