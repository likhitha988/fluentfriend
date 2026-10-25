import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Brain, Check, Trash2, Volume2, X } from 'lucide-react';
import { api, Word } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { speechOutput } from '../lib/speech';
import { Empty, ErrorBox, PageHeader, Spinner } from '../components/ui';

type Filter = 'all' | Word['status'];
const STATUS_STYLE: Record<Word['status'], string> = {
  new: 'bg-slate-100 text-slate-700',
  learning: 'bg-amber-100 text-amber-800',
  mastered: 'bg-emerald-100 text-emerald-800',
};

interface QuizQ { wordId: string; type: 'fill' | 'meaning'; prompt: string; options: string[] }

export default function Vocabulary() {
  const { settings } = useAuth();
  const [words, setWords] = useState<Word[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [quiz, setQuiz] = useState(false);

  const load = useCallback(() => {
    setError('');
    api.get<{ words: Word[] }>('/vocabulary').then((r) => setWords(r.words)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const remove = async (id: string) => {
    try {
      await api.del(`/vocabulary/${id}`);
      setWords((w) => w?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const hear = (w: string) => void speechOutput.speak(w, { rate: 0.85, voiceURI: settings?.voiceURI });

  if (quiz) return <Quiz onClose={() => { setQuiz(false); load(); }} />;
  if (error && !words) return <ErrorBox message={error} onRetry={load} />;
  if (!words) return <Spinner />;

  const shown = words.filter((w) => filter === 'all' || w.status === filter);

  return (
    <div>
      <PageHeader
        title="Vocabulary notebook"
        subtitle="Words you saved from your conversations."
        action={<button className="btn-primary" disabled={words.length < 3} onClick={() => setQuiz(true)}><Brain size={16} /> Practise with a quiz</button>}
      />
      {words.length > 0 && words.length < 3 && <p className="-mt-3 mb-4 text-sm text-slate-500">Save at least 3 words to unlock quizzes.</p>}
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {words.length === 0 ? (
        <Empty icon={<BookOpen size={32} />} title="Your notebook is empty">
          When a conversation shows you a new word, tap Save to keep it here. Then use it in your next chat.
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter words">
            {(['all', 'new', 'learning', 'mastered'] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
              >
                {f} {f === 'all' ? `(${words.length})` : `(${words.filter((w) => w.status === f).length})`}
              </button>
            ))}
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((w) => (
              <li key={w.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold">{w.word}</p>
                    {w.pronunciation && <p className="text-xs text-slate-500">{w.pronunciation}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`chip capitalize ${STATUS_STYLE[w.status]}`}>{w.status}</span>
                    <button onClick={() => hear(w.word)} aria-label={`Hear ${w.word}`} className="btn-ghost p-2"><Volume2 size={16} /></button>
                    <button onClick={() => remove(w.id)} aria-label={`Remove ${w.word}`} className="btn-ghost p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="mt-1 text-slate-700">{w.meaning}</p>
                <p className="mt-2 text-sm italic text-slate-600">“{w.example}”</p>
                {w.dailyExample && <p className="mt-1 text-sm italic text-slate-500">“{w.dailyExample}”</p>}
                <p className="mt-3 text-xs text-slate-500">
                  Used in conversation {w.usedCount}×{w.reviewCount > 0 && ` · reviewed ${w.reviewCount}×`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Quiz({ onClose }: { onClose: () => void }) {
  const [qs, setQs] = useState<QuizQ[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: string; example: string } | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ questions: QuizQ[] }>('/vocabulary/quiz?count=5').then((r) => setQs(r.questions)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="space-y-3"><ErrorBox message={error} /><button className="btn-secondary" onClick={onClose}>Back</button></div>;
  if (!qs) return <Spinner />;
  if (qs.length === 0) return <div className="space-y-3"><Empty icon={<Brain />} title="Not enough words yet">Save at least 3 words to try a quiz.</Empty><button className="btn-secondary" onClick={onClose}>Back</button></div>;

  if (i >= qs.length) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h2 className="text-2xl font-bold">{score} of {qs.length} correct</h2>
        <p className="mt-2 text-slate-600">Now use these words in a real conversation. That is how they stick.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-primary" onClick={onClose}>Done</button>
          <a className="btn-secondary" href="/app/talk">Start a conversation</a>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const answer = async (opt: string) => {
    if (picked) return;
    setPicked(opt);
    try {
      const r = await api.post<{ correct: boolean; answer: string; example: string }>('/vocabulary/quiz/answer', { wordId: q.wordId, answer: opt });
      setResult(r);
      if (r.correct) setScore((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const next = () => {
    setPicked(null);
    setResult(null);
    setI((n) => n + 1);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>Question {i + 1} of {qs.length}</span>
        <button onClick={onClose} className="btn-ghost p-2" aria-label="Close quiz"><X size={16} /></button>
      </div>
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {q.type === 'fill' ? 'Fill in the blank' : 'Which word means this?'}
        </p>
        <p className="mt-2 text-lg font-medium">{q.type === 'fill' ? `“${q.prompt}”` : q.prompt}</p>
        <div className="mt-4 grid gap-2">
          {q.options.map((o) => {
            const isRight = result && o.toLowerCase() === result.answer.toLowerCase();
            const isWrong = result && picked === o && !result.correct;
            return (
              <button
                key={o}
                onClick={() => answer(o)}
                disabled={!!picked}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left font-medium transition ${
                  isRight ? 'border-emerald-400 bg-emerald-50' : isWrong ? 'border-rose-400 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {o} {isRight && <Check size={18} className="text-emerald-600" />}
              </button>
            );
          })}
        </div>
        {result && (
          <div className="mt-4 text-sm" role="status">
            <p className={`font-semibold ${result.correct ? 'text-emerald-700' : 'text-rose-700'}`}>{result.correct ? 'Correct!' : `Not quite. The answer is "${result.answer}".`}</p>
            <p className="mt-1 italic text-slate-600">“{result.example}”</p>
            <button onClick={next} className="btn-primary mt-4">{i + 1 === qs.length ? 'See result' : 'Next'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
