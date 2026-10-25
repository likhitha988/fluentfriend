/**
 * Replaceable speech layer. The UI only talks to the SpeechInput / SpeechOutput interfaces,
 * so a dedicated STT/TTS provider (Deepgram, Azure, ElevenLabs...) can be dropped in later
 * by implementing the same interfaces.
 *
 * The browser-native implementation uses the Web Speech API:
 *  - Recognition: Chrome, Edge, Android Chrome and Safari (webkit prefix). NOT Firefox.
 *  - Synthesis: all major browsers.
 * Recognition in Chrome sends audio to Google's servers; nothing is recorded or stored by FluentFriend.
 */

export type SpeechErrorKind = 'permission' | 'no-speech' | 'network' | 'audio' | 'unsupported' | 'other';

export interface SpeechInputHandlers {
  onInterim: (text: string) => void;
  /** Called once per spoken turn when the browser decides the user stopped talking. */
  onFinal: (text: string, speakingSeconds: number) => void;
  onError: (kind: SpeechErrorKind, message: string) => void;
  onEnd: () => void;
}

export interface SpeechInput {
  readonly supported: boolean;
  start(lang: string, h: SpeechInputHandlers): void;
  stop(): void;
  abort(): void;
}

export interface SpeechOutput {
  readonly supported: boolean;
  speak(text: string, opts: { voiceURI?: string; rate?: number; lang?: string }): Promise<void>;
  cancel(): void;
  getVoices(): Promise<SpeechSynthesisVoice[]>;
}

const Ctor: any =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

const ERROR_MAP: Record<string, [SpeechErrorKind, string]> = {
  'not-allowed': ['permission', 'Microphone access is blocked. Allow the microphone in your browser settings, or type instead.'],
  'service-not-allowed': ['permission', 'Speech recognition is not allowed in this browser. You can type instead.'],
  'no-speech': ['no-speech', "I didn't hear anything. Tap the mic and try again."],
  'audio-capture': ['audio', 'No microphone was found. Check that one is connected, or type instead.'],
  network: ['network', 'Speech recognition lost its connection. Check your internet and try again.'],
};

export class BrowserSpeechInput implements SpeechInput {
  readonly supported = !!Ctor;
  private rec: any = null;
  private stopped = false;

  start(lang: string, h: SpeechInputHandlers): void {
    if (!Ctor) {
      h.onError('unsupported', 'Voice input is not supported in this browser. Use Chrome, Edge or Safari, or type instead.');
      h.onEnd();
      return;
    }
    this.abort();
    this.stopped = false;
    const rec = new Ctor();
    this.rec = rec;
    rec.lang = lang;
    rec.interimResults = true;
    // Continuous mode is unreliable on Android and Safari, so each turn is one recognition session.
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = '';
    let firstAt = 0;
    let lastAt = 0;
    let delivered = false;
    let errored = false;

    rec.onresult = (e: any) => {
      const now = Date.now();
      if (!firstAt) firstAt = now;
      lastAt = now;
      let interim = '';
      finalText = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      h.onInterim((finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      errored = true;
      const [kind, msg] = ERROR_MAP[e.error] ?? (e.error === 'aborted' ? ['other', ''] : ['other', 'Speech recognition had a problem. Please try again.']);
      if (e.error !== 'aborted' && msg) h.onError(kind as SpeechErrorKind, msg);
    };
    rec.onend = () => {
      const text = finalText.trim();
      if (!delivered && !errored && !this.stopped && text) {
        delivered = true;
        const secs = firstAt ? Math.max(1, Math.round((lastAt - firstAt) / 1000)) : 0;
        h.onFinal(text, secs);
      } else if (!errored && !text && !this.stopped) {
        h.onError('no-speech', "I didn't catch that. Tap the mic and try again.");
      }
      h.onEnd();
    };
    try {
      rec.start();
    } catch {
      h.onError('other', 'Could not start the microphone. Please try again.');
      h.onEnd();
    }
  }

  /** Stop listening but still deliver what was heard. */
  stop(): void {
    try {
      this.rec?.stop();
    } catch {
      /* already stopped */
    }
  }

  /** Stop listening and discard anything heard. */
  abort(): void {
    this.stopped = true;
    try {
      this.rec?.abort();
    } catch {
      /* already stopped */
    }
    this.rec = null;
  }
}

export class BrowserSpeechOutput implements SpeechOutput {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private keepAlive: number | undefined;

  getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.supported) return Promise.resolve([]);
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length) return Promise.resolve(now);
    return new Promise((resolve) => {
      const done = () => resolve(synth.getVoices());
      synth.addEventListener('voiceschanged', done, { once: true });
      window.setTimeout(done, 1500);
    });
  }

  async speak(text: string, opts: { voiceURI?: string; rate?: number; lang?: string }): Promise<void> {
    if (!this.supported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = await this.getVoices();
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const chosen =
        voices.find((v) => v.voiceURI === opts.voiceURI) ??
        voices.find((v) => v.lang === (opts.lang ?? 'en-US')) ??
        voices.find((v) => v.lang.startsWith('en'));
      if (chosen) {
        u.voice = chosen;
        u.lang = chosen.lang;
      } else u.lang = opts.lang ?? 'en-US';
      u.rate = opts.rate ?? 1;
      const finish = () => {
        window.clearInterval(this.keepAlive);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      // Chrome silently stops long utterances after ~15s; pausing/resuming keeps them going.
      window.clearInterval(this.keepAlive);
      this.keepAlive = window.setInterval(() => {
        if (!synth.speaking) return;
        synth.pause();
        synth.resume();
      }, 10000);
    });
  }

  cancel(): void {
    if (!this.supported) return;
    window.clearInterval(this.keepAlive);
    window.speechSynthesis.cancel();
  }
}

export const speechInput: SpeechInput = new BrowserSpeechInput();
export const speechOutput: SpeechOutput = new BrowserSpeechOutput();
