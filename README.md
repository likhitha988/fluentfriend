# FluentFriend: AI English Speaking Coach

A voice-first speaking partner for people who already know basic English and want to speak it fluently.

- **Frontend:** React + Vite + TypeScript + Tailwind + React Router + Lucide (`client/`)
- **Backend:** Node + Express + TypeScript (`server/`)
- **Database:** MongoDB Atlas via Mongoose
- **AI:** provider abstraction (Anthropic or any OpenAI-compatible API); keys stay on the server
- **Speech:** browser Web Speech API behind a replaceable interface (`client/src/lib/speech.ts`)

> **Status:** this code was written without being able to run `npm install` or the compiler in the build sandbox
> (its network blocked the npm registry). Run the checks in "First run" below and fix anything they report before relying on it.

## Architecture

```
Browser (React)                       Express API                          External
 ├─ SpeechInput  (Web Speech STT) ─┐   /api/auth          register/login/logout (JWT in httpOnly cookie)
 ├─ SpeechOutput (speechSynthesis) │   /api/conversations start, send message, end, list, delete
 └─ pages ── fetch /api (cookie) ──┴─▶ /api/vocabulary    save, quiz, review
                                       /api/practice      daily challenge + catalog
                                       /api/dashboard     dashboard data
                                       /api/progress      stats, self-rated confidence
                                       /api/settings      preferences
                                       /api/account       export + delete
                                          │
                              services/ai/engine.ts  ──▶ LLM provider (Anthropic / OpenAI-compatible)
                                          │             returns JSON {reply, correction, vocabulary}
                                          │             validated with zod, one repair retry
                                          └──▶ MongoDB Atlas
```

Voice turn: mic → browser speech recognition → text → `POST /conversations/:id/messages` → AI reply JSON →
reply is spoken with speech synthesis → mic re-opens automatically. Corrections and vocabulary are shown in side
panels, never spoken, so they don't interrupt the conversation.

### Speech: is browser-native good enough?

Good enough for the prototype, with limits:

| | Chrome / Edge (desktop + Android) | Safari (iOS/macOS) | Firefox |
|---|---|---|---|
| Speech recognition | Yes (audio goes to Google's servers) | Partial | **No** (typing fallback is shown) |
| Speech synthesis | Yes | Yes | Yes |

Each turn is one recognition session (not "continuous" mode) because continuous mode is unreliable on Android/Safari.
To add a dedicated provider (Deepgram, Azure, ElevenLabs...), implement `SpeechInput` / `SpeechOutput` in
`client/src/lib/speech.ts` and export it in place of the browser classes.

## First run (local)

Requirements: Node 18.18+ (20 or 22 recommended), a free MongoDB Atlas cluster, and an AI API key.

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then edit .env
npm run typecheck           # should print nothing
npm test                    # unit tests (no database or API key needed)
npm run dev                 # http://localhost:4000

# 2. Client (new terminal)
cd client
npm install
npm run build               # type-checks and builds
npm run dev                 # http://localhost:5173
```

### Environment variables (`server/.env`)

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas → your cluster → Connect → Drivers. Allow your IP under Network Access. |
| `JWT_SECRET` | 32+ random chars: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN` | Frontend URL(s), comma-separated, no trailing slash. `http://localhost:5173` locally. |
| `AI_PROVIDER` | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Used when `AI_PROVIDER=anthropic`. Check the model name in your Anthropic console. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | For OpenAI or any compatible endpoint. |

The server refuses to start with a clear message if required variables are missing. If the AI key is missing the server
still starts, and the app shows a "not configured" message instead of fake replies.

### Try it

1. Open http://localhost:5173 → Sign up.
2. Dashboard → **Start conversation** → allow the microphone (use Chrome or Edge).
3. Speak. You should see your words appear live, then hear the reply, and the mic re-opens.
4. Say something with a clear mistake ("Yesterday I go to college"). A correction appears in the side panel.
5. Save a suggested word, then open **Vocabulary** and take the quiz (needs 3 saved words).
6. Take the daily challenge (3 replies completes it) and check **Progress**.

## Deployment

### 1. MongoDB Atlas
Create a free cluster → Database Access: create a user → Network Access: allow `0.0.0.0/0` (Render has no fixed IP)
→ copy the connection string into `MONGODB_URI`.

### 2. Backend on Render
- New → Web Service → connect your GitHub repo. Root directory `server`.
- Build command: `npm install && npm run build`; start command: `npm start`.
  (Or use the included `render.yaml` Blueprint.)
- Set the environment variables above, plus `NODE_ENV=production` and `CLIENT_ORIGIN=https://<your-vercel-domain>`.
- Check `https://<service>.onrender.com/api/health`.

### 3. Frontend on Vercel
- Import the repo, root directory `client`, framework Vite.
- Edit `client/vercel.json` and replace `YOUR-RENDER-SERVICE` with your Render hostname. This proxies `/api` through
  your Vercel domain so login cookies are first-party (works in Safari and with third-party-cookie blocking).
- Deploy, then put the final Vercel URL into `CLIENT_ORIGIN` on Render.

If you prefer the browser to call Render directly, set `VITE_API_URL` on Vercel and `COOKIE_SAMESITE=none` on Render.
Some browsers block those cross-site cookies, which is why the rewrite is the default.

Render's free tier sleeps after inactivity, so the first request can take ~30-60 seconds.

## Privacy and security notes

- Voice is never recorded or uploaded by FluentFriend. Chrome's speech recognition sends audio to Google to transcribe it.
- Stored: account, settings, conversation text, saved words, progress. Settings → Your data lets users download everything,
  delete conversation history, or delete the account.
- Passwords: bcrypt (cost 12). Sessions: JWT in an httpOnly, Secure (in production) cookie. State-changing requests
  require an `X-Requested-With` header (CSRF defence together with CORS).
- zod validation on every route, per-user ownership checks on every query, helmet, rate limits (global, auth, AI turns),
  AI call timeouts with one retry, and error/log output that never includes secrets or request bodies.

## What is measured vs estimated

- **Measured:** speaking time per voice turn (first to last recognised word), turns, conversations, streaks, words used.
- **Estimated:** focus areas (counted from corrections the AI chose to show).
- **Self-reported:** confidence ratings.
- **Not provided:** pronunciation scoring. Browser speech APIs don't offer a reliable way to do it.

## Known limitations

- Daily reminders are saved as a preference only; no push/email sender is built.
- Replies are returned as a whole (not token-streamed) because the reply is JSON that must be validated first.
- The model's corrections are guided by the prompt plus server-side guards, but an LLM can still occasionally be wrong.
- No automated tests for the React UI or the database routes yet; the included tests cover the AI-response validation and helpers.
