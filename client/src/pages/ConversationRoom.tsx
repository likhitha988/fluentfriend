import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookmarkPlus, Check, CheckCircle2, Keyboard, Loader2, Mic, MicOff, Pause, Play, Send, Square, Volume2,
} from 'lucide-react';
import { api, ApiError, Conversation, Correction, Message, Vocab } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { speechInput, speechOutput } from '../lib/speech';
import { ErrorBox } from '../components/ui';

type Phase = 'setup' | 'starting' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'ended';

const PHASE_LABEL: Record<Phase, string> = {
  setup: 'Ready when you are',
  starting: 'Getting ready…',
  idle: 'Your turn: tap the mic or type',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  paused: 'Paused',
  ended: 'Conversation ended',
};

interface TurnResponse {
  userMessage: Message;
  assistantMessage: Message;
  usedWords: string[];
  challengeCompleted: boolean;
  stats: { currentStreak: number; conversationSpeakingSeconds: number; userTurns: number };
}

export default function ConversationRoom() {
  const { settings } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') ?? 'free';
  const itemId = params.get('item') ?? undefined;

  const [phase, setPhaseState] = useState<Phase>('setup');
  const phaseRef = useRef<Phase>('setup');
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const [conv, setConv] = useState<Conversation | null>(null);
  const convRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState('');
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [notice, setNotice] = useState('');
  const [fatal, setFatal] = useState('');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [challengeDone, setChallengeDone] = useState(false);
  const [rating, setRating] = useState(0);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const micSupported = speechInput.supported;
  const lang = settings?.recognitionLang ?? 'en-US';
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Words the learner already saved, so the Save button shows the right state.
  useEffect(() => {
    api.get<{ words: { word: string }[] }>('/vocabulary').then((r) => setSaved(new Set(r.words.map((w) => w.word.toLowerCase())))).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, interim, phase]);

  useEffect(
    () => () => {
      endedRef.current = true;
      speechOutput.cancel();
      speechInput.abort();
    },
    [],
  );

  const listen = useCallback(() => {
    if (endedRef.current || pausedRef.current) return;
    if (!speechInput.supported) {
      setPhase('idle');
      return;
    }
    setNotice('');
    setInterim('');
    setPhase('listening');
    speechInput.start(settingsRef.current?.recognitionLang ?? 'en-US', {
      onInterim: setInterim,
      onFinal: (t, secs) => void send(t, 'voice', secs),
      onError: (kind, msg) => {
        setNotice(msg);
        if (kind === 'permission' || kind === 'unsupported' || kind === 'audio') setTyping(true);
        if (phaseRef.current === 'listening') setPhase('idle');
      },
      onEnd: () => {
        setInterim('');
        if (phaseRef.current === 'listening') setPhase('idle');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPhase]);

  const speakThenListen = useCallback(
    async (t: string) => {
      if (endedRef.current) return;
      if (pausedRef.current) return setPhase('paused');
      const s = settingsRef.current;
      setPhase('speaking');
      await speechOutput.speak(t, { voiceURI: s?.voiceURI, rate: s?.speechRate, lang: s?.recognitionLang });
      if (endedRef.current || pausedRef.current || phaseRef.current !== 'speaking') return;
      if (s?.autoListen !== false && speechInput.supported) listen();
      else setPhase('idle');
    },
    [listen, setPhase],
  );

  const send = useCallback(
    async (t: string, source: 'voice' | 'text', secs = 0) => {
      const id = convRef.current;
      const clean = t.trim();
      if (!id || !clean || endedRef.current) return;
      speechOutput.cancel();
      setNotice('');
      setPhase('thinking');
      const temp: Message = {
        id: `tmp-${Date.now()}`, role: 'user', content: clean, source, correction: null, vocabulary: null, createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, temp]);
      try {
        const r = await api.post<TurnResponse>(`/conversations/${id}/messages`, { text: clean, source, speakingSeconds: secs });
        setMessages((m) => [...m.filter((x) => x.id !== temp.id), r.userMessage, r.assistantMessage]);
        if (r.challengeCompleted) setChallengeDone(true);
        void speakThenListen(r.assistantMessage.content);
      } catch (e) {
        setMessages((m) => m.filter((x) => x.id !== temp.id));
        if (source === 'text') setText(clean);
        const err = e as ApiError;
        setNotice(err.message + (source === 'voice' ? ` (You said: "${clean}")` : ''));
        if (err.status === 409) setPhase('ended');
        else setPhase('idle');
      }
    },
    [setPhase, speakThenListen],
  );

  const begin = async () => {
    setFatal('');
    setPhase('starting');
    endedRef.current = false;
    pausedRef.current = false;
    // Unlock speech synthesis inside the tap (required by iOS/Safari autoplay rules).
    if (speechOutput.supported) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    try {
      const r = await api.post<{ conversation: Conversation; messages: Message[] }>('/conversations', { mode, itemId });
      setConv(r.conversation);
      convRef.current = r.conversation.id;
      setMessages(r.messages);
      if (!micSupported) setTyping(true);
      void speakThenListen(r.messages[r.messages.length - 1].content);
    } catch (e) {
      setFatal((e as Error).message);
      setPhase('setup');
    }
  };

  const onMic = () => {
    if (phase === 'listening') speechInput.stop();
    else if (phase === 'speaking') {
      speechOutput.cancel();
      listen();
    } else if (phase === 'idle') listen();
  };

  const pause = () => {
    pausedRef.current = true;
    speechOutput.cancel();
    speechInput.abort();
    setInterim('');
    setPhase('paused');
  };
  const resume = () => {
    pausedRef.current = false;
    listen();
  };

  const end = async () => {
    endedRef.current = true;
    speechOutput.cancel();
    speechInput.abort();
    setInterim('');
    const id = convRef.current;
    setPhase('ended');
    if (!id) return;
    try {
      const r = await api.post<{ conversation: Conversation }>(`/conversations/${id}/end`);
      setConv(r.conversation);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const submitText = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || (phase !== 'idle' && phase !== 'listening' && phase !== 'speaking')) return;
    speechInput.abort();
    const t = text;
    setText('');
    void send(t, 'text');
  };

  const saveWord = async (v: Vocab) => {
    try {
      await api.post('/vocabulary', { ...v, sourceConversation: convRef.current ?? undefined });
      setSaved((s) => new Set(s).add(v.word.toLowerCase()));
    } catch (e) {
      if ((e as ApiError).status === 409) setSaved((s) => new Set(s).add(v.word.toLowerCase()));
      else setNotice((e as Error).message);
    }
  };

  const rate = async (n: number) => {
    setRating(n);
    try {
      await api.post('/progress/confidence', { rating: n });
    } catch {
      /* non-critical */
    }
  };

  const corrections = useMemo(
    () => messages.filter((m) => m.correction).map((m) => m.correction as Correction).reverse(),
    [messages],
  );
  const vocabs = useMemo(() => messages.filter((m) => m.vocabulary).map((m) => m.vocabulary as Vocab).reverse(), [messages]);

  const active = phase !== 'setup' && phase !== 'starting' && phase !== 'ended';
  const micBusy = phase === 'thinking' || phase === 'starting' || phase === 'paused';

  // ----- Start screen -----
  if (phase === 'setup' || phase === 'starting') {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <Avatar phase="idle" />
        <h1 className="mt-6 text-2xl font-bold">Ready to talk?</h1>
        <p className="mt-2 text-slate-600">
          {micSupported
            ? 'Your browser will ask to use the microphone. I will listen, reply out loud, and show gentle corrections on the side.'
            : 'Voice input is not available in this browser, so you will type your replies. For full voice practice use Chrome, Edge or Safari.'}
        </p>
        {fatal && <div className="mt-4 text-left"><ErrorBox message={fatal} /></div>}
        <button onClick={begin} disabled={phase === 'starting'} className="btn-primary mt-6 px-8 py-3 text-base">
          {phase === 'starting' ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />} Start conversation
        </button>
        <p className="mt-4 text-xs text-slate-500">Voice is turned into text by your browser. FluentFriend never saves audio.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Conversation column */}
      <section className="lg:col-span-3" aria-label="Conversation">
        <div className="card flex flex-col items-center gap-3 text-center">
          <div className="flex w-full items-start justify-between text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{conv?.title}</p>
              <p className="text-xs text-slate-500">{conv?.mode === 'free' ? 'Free conversation' : conv?.mode}</p>
            </div>
            {active && (
              <div className="flex gap-2">
                {phase === 'paused' ? (
                  <button onClick={resume} className="btn-secondary px-3 py-1.5"><Play size={16} /> Resume</button>
                ) : (
                  <button onClick={pause} className="btn-secondary px-3 py-1.5"><Pause size={16} /> Pause</button>
                )}
                <button onClick={end} className="btn-secondary px-3 py-1.5 text-rose-600"><Square size={14} /> End</button>
              </div>
            )}
          </div>

          <Avatar phase={phase} />
          <p className="text-sm font-medium text-slate-700" aria-live="polite">{PHASE_LABEL[phase]}</p>

          {phase !== 'ended' && (
            <button
              onClick={onMic}
              disabled={micBusy || !micSupported}
              aria-label={phase === 'listening' ? 'Stop and send' : 'Start speaking'}
              className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-lg transition disabled:opacity-40 ${
                phase === 'listening' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {phase === 'listening' && <span className="absolute inset-0 animate-ring rounded-full bg-rose-400" />}
              {micSupported ? (phase === 'listening' ? <Square size={26} className="relative" /> : <Mic size={30} className="relative" />) : <MicOff size={30} />}
            </button>
          )}
          {phase === 'listening' && <p className="text-xs text-slate-500">Tap to finish early, or just stop talking.</p>}
          {phase === 'speaking' && <p className="text-xs text-slate-500">Tap the mic to interrupt and answer.</p>}
        </div>

        {notice && <div className="mt-3"><ErrorBox message={notice} /></div>}
        {challengeDone && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} /> Today's challenge is complete. Keep talking if you like.
          </div>
        )}

        <div ref={scrollRef} className="card mt-3 max-h-[42vh] min-h-[160px] space-y-3 overflow-y-auto" aria-label="Conversation history" role="log">
          {messages.map((m) => (
            <div key={m.id} className={`flex animate-fadeup ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${m.role === 'user' ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {phase === 'listening' && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-dashed border-brand-300 px-4 py-2.5 text-[15px] text-brand-700">
                {interim || '…'}
              </div>
            </div>
          )}
          {phase === 'thinking' && (
            <div className="flex gap-1.5 px-2" aria-label="Thinking">
              {[0, 0.2, 0.4].map((d) => <span key={d} className="h-2 w-2 animate-dots rounded-full bg-slate-400" style={{ animationDelay: `${d}s` }} />)}
            </div>
          )}
        </div>

        {phase === 'ended' ? (
          <div className="card mt-3 space-y-4">
            <h2 className="text-lg font-bold">Nice work.</h2>
            <p className="text-sm text-slate-600">
              {conv?.summary || 'Your conversation is saved in your history.'}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>{conv?.userTurns ?? 0} replies</span>
              {!!conv?.speakingSeconds && <span>about {Math.max(1, Math.round(conv.speakingSeconds / 60))} min of speaking</span>}
            </div>
            <div>
              <p className="label">How confident did you feel speaking today?</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Confidence from 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={rating === n}
                    onClick={() => rate(n)}
                    className={`h-10 w-10 rounded-full border text-sm font-semibold ${rating === n ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">1 = nervous, 5 = very confident. This is your own rating.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.location.assign('/app/talk')} className="btn-primary">New conversation</button>
              <button onClick={() => nav('/app')} className="btn-secondary">Back to home</button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            {!typing ? (
              <button onClick={() => setTyping(true)} className="btn-ghost text-slate-500"><Keyboard size={16} /> Type instead</button>
            ) : (
              <form onSubmit={submitText} className="flex gap-2">
                <input
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your reply…"
                  maxLength={1500}
                  aria-label="Type your reply"
                  disabled={phase === 'thinking' || phase === 'paused'}
                />
                <button className="btn-primary" disabled={!text.trim() || phase === 'thinking' || phase === 'paused'} aria-label="Send">
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Learning panels */}
      <aside className="space-y-4 lg:col-span-2" aria-label="Learning panels">
        <div className="card">
          <h2 className="font-semibold">Corrections</h2>
          {corrections.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing to fix so far. If something useful comes up, it will appear here without interrupting you.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {corrections.map((c, i) => (
                <li key={i} className={`rounded-xl border p-3 text-sm ${i === 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                  <p className="text-slate-500 line-through decoration-rose-300">{c.original}</p>
                  <p className="mt-1 flex items-start gap-1.5 font-semibold text-slate-900"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{c.improved}</p>
                  <p className="mt-1.5 text-slate-600">{c.explanation}</p>
                  {i === 0 && active && phase !== 'paused' && (
                    <div className="mt-2 flex gap-2">
                      <button className="btn-secondary px-3 py-1 text-xs" onClick={() => void speechOutput.speak(c.improved, { rate: settings?.speechRate, voiceURI: settings?.voiceURI })}>
                        <Volume2 size={14} /> Hear it
                      </button>
                      <span className="self-center text-xs text-slate-500">Try saying it again in your next reply.</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">New words</h2>
          {vocabs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Useful words and expressions from your conversation will show up here.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {vocabs.map((v) => {
                const isSaved = saved.has(v.word.toLowerCase());
                return (
                  <li key={v.word} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-slate-900">{v.word}</p>
                        {v.pronunciation && <p className="text-xs text-slate-500">{v.pronunciation}</p>}
                      </div>
                      <div className="flex gap-1.5">
                        <button aria-label={`Hear ${v.word}`} className="btn-ghost p-2" onClick={() => void speechOutput.speak(v.word, { rate: 0.85, voiceURI: settings?.voiceURI })}>
                          <Volume2 size={16} />
                        </button>
                        <button disabled={isSaved} onClick={() => saveWord(v)} className="btn-secondary px-3 py-1.5 text-xs">
                          {isSaved ? <><Check size={14} /> Saved</> : <><BookmarkPlus size={14} /> Save</>}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-slate-700">{v.meaning}</p>
                    <p className="mt-1.5 italic text-slate-600">“{v.example}”</p>
                    {v.dailyExample && <p className="mt-1 italic text-slate-500">“{v.dailyExample}”</p>}
                    <p className="mt-2 text-xs font-medium text-brand-600">Try using it in your next answer.</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Avatar({ phase }: { phase: Phase }) {
  const speaking = phase === 'speaking';
  const listening = phase === 'listening';
  const thinking = phase === 'thinking';
  return (
    <div className="relative grid h-28 w-28 place-items-center" aria-hidden="true">
      {(speaking || listening) && (
        <span className={`absolute inset-0 animate-ring rounded-full ${listening ? 'bg-rose-300' : 'bg-brand-300'}`} />
      )}
      <div
        className={`relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-soft transition ${thinking ? 'opacity-80' : ''}`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </div>
          {speaking ? (
            <div className="flex h-4 items-center gap-0.5">
              {[0, 0.12, 0.24, 0.12, 0].map((d, i) => <span key={i} className="h-full w-1 origin-center animate-talk rounded-full bg-white" style={{ animationDelay: `${d}s` }} />)}
            </div>
          ) : (
            <span className={`h-1.5 rounded-full bg-white ${listening ? 'w-5' : 'w-7'}`} />
          )}
        </div>
      </div>
    </div>
  );
}
