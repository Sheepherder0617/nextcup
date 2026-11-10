# NextCup — Coffee Chat Tracker

A web app for students to prep for coffee chats, log what they learned in two minutes, and never miss the thank-you or follow-up. Built from our Stitch designs (Warm Editorial Professional).

## What works today

| Screen | What it does |
|---|---|
| Landing | Intro + "Launch workspace" |
| Sign up / profile setup | Name, headline, school, target roles, resume highlights |
| Dashboard | Next chat (join link, AI brief, add to calendar), chats waiting for a debrief, follow-ups due this week, network funnel |
| Contacts | Search, relationship filters, sort, pagination, stats |
| Add / edit contact | Role types, where you met, goals, research notes, "Save & Generate AI Prep" |
| Contact profile | Meeting history timeline, notes log, AI follow-up ideas, AI prep brief, prep checklist |
| Calendar | Upcoming / past, type filters, month view, AI prep, post-meeting notes, delete with confirm |
| Schedule a chat | Pick contact, format (video / in-person / phone), date, time, duration, topic, .ics invite |
| Profile | Goals, wishlist, **30s / 1 min / 2 min pitches** with AI refine, resume → skill tags, AI tone, follow-up cadence, export / delete data, theme |
| **Log a chat** (button everywhere) | Rough notes → AI tidies into headline, takeaways, next step → auto-plans a thank-you (next day) and a check-in (N weeks later) |

AI features: prep brief, prep chat assistant, tidy notes, thank-you / follow-up drafts, follow-up ideas, pitch refine, skill extraction. All live in `src/lib/ai.ts`.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Data is saved in your browser (localStorage) when running locally. AI buttons show "not connected" until you set up an AI endpoint (below).

## Project layout

```
src/
  App.tsx              routes (hash-based), top nav, bottom tab bar on mobile
  index.css            design tokens (light + dark) and Tailwind v4 theme
  lib/
    types.ts           data model: Profile, Contact, ChatEvent, Note
    store.tsx          storage (Supabase | Claude private store | localStorage) + sign-in state
    supabase.ts        Supabase client, access token for /api/ai, sign-in error messages
    ai.ts              every AI prompt + provider switch
    derive.ts          upcoming chats, due follow-ups, funnel numbers
    date.ts, files.ts  date helpers, .ics invites and file export
  components/          ui kit, logo, Log-a-chat modal, AI prep assistant, draft modal
  pages/               one file per screen (Auth.tsx = sign in / create account)
supabase/schema.sql    tables, privacy rules, AI usage counter, funnel view
api/ai.ts              Vercel function that calls the Claude API with your key
scripts/build-artifact.mjs   builds a single HTML file (used for the Claude-hosted preview)
```

## Data model (maps 1:1 to database tables later)

- **profile** — one per user: name, headline, school, target roles, wishlist, pitches, skills, tone, default duration, follow-up cadence
- **contacts** — name, title, company, roleTypes[], metVia, metAt, goals[], notes, lastContact, checklist, aiPrep, aiFollowUps
- **events** — contactId, kind (`coffee` | `thankyou` | `followup`), start, durationMin, format, location/link, topic, status (`planned` | `done`), draft
- **notes** — contactId, eventId?, date, headline, body, nextStep, kind (`debrief` | `prep` | `intro` | `note`), pinned

## Accounts & database (Supabase)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` and the app switches from browser storage to real accounts: people create an account with email + password, and their profile, contacts, events and notes are saved in Supabase, private to them (Row Level Security). Step-by-step: [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md). Schema: [supabase/schema.sql](supabase/schema.sql).

Without those two variables the app still runs and saves to the browser, which is handy for quick UI work.

## AI setup (Groq, free tier)

AI requests go from the browser to `/api/ai` (our own server code in `api/ai.ts`), which calls Groq with the key. The key never reaches the browser.

- **Local:** copy `.env.example` to `.env.local` and paste your key into `GROQ_API_KEY`. `npm run dev` serves `/api/ai` for you.
- **Vercel:** Project → Settings → Environment Variables → add `GROQ_API_KEY` (Production + Preview), then redeploy.
- **Who can call it:** when Supabase is configured, only signed-in users, up to `AI_DAILY_LIMIT` requests per person per day (default 40).
- **Model:** defaults to `openai/gpt-oss-120b`. Set `GROQ_MODEL` to try another model from console.groq.com/docs/models without code changes.
- **Switching provider later** (OpenAI, Claude, Gemini): only `api/ai.ts` changes.

## Deploy (Vercel)

1. Import the GitHub repo in Vercel (framework: Vite). Vercel also deploys `api/ai.ts` as a serverless function.
2. Add `GROQ_API_KEY` as above. Every push to `main` redeploys; every PR gets its own preview link.

## Suggested split (Sijie + Chloe)

- **Sijie — Chats & follow-ups:** `LogChatModal`, `DraftModal`, `Dashboard`, `Calendar`, `Schedule`, `lib/ai.ts`, funnel analytics, Supabase backend.
- **Chloe — Contacts & profile:** `Contacts`, `ContactForm`, `ContactProfile`, `Profile`, `Landing`, `Onboarding`, visual polish against Stitch.
- Shared rule: change `lib/types.ts` together, one feature branch per change, open a PR and let the other person review the Vercel preview link.
