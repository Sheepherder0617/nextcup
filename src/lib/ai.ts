import type { Contact, FollowUpIdeas, Note, PrepBrief, Profile, ChatEvent } from "./types";
import { GOAL_LABEL, ROLE_LABEL, TONE_LABEL } from "./types";
import { formatDate, todayISO } from "./date";
import { getAccessToken } from "./supabase";

/*
 * AI layer. Order of preference:
 * 1. Inside Claude: the page asks Claude directly (the viewer approves once).
 * 2. Own hosting: POST to VITE_AI_ENDPOINT (see api/ai.ts for a Vercel example).
 * 3. Neither: callers get an AiError with code "unavailable" and show a fallback.
 */

export interface AiError { code: string; message: string; text?: string }

declare const __AI_ENDPOINT__: string;
const ENDPOINT: string = typeof __AI_ENDPOINT__ !== "undefined" ? __AI_ENDPOINT__ : "";

let samplePromise: Promise<any> | null = null;
function getSample(): Promise<any> {
  if (!samplePromise) {
    const c = (window as any).claude;
    samplePromise = c?.use ? c.use("sample").catch(() => null) : Promise.resolve(null);
  }
  return samplePromise!;
}

let disabled = false;

export async function aiAvailable(): Promise<boolean> {
  if (disabled) return false;
  return !!(await getSample()) || !!ENDPOINT;
}

type Turn = { role: "user" | "assistant"; content: string };
interface Opts { onText?: (text: string) => void; signal?: AbortSignal; quick?: boolean; fresh?: boolean }

async function viaEndpoint(input: string | Turn[], json: boolean, opts: Opts): Promise<any> {
  const token = await getAccessToken().catch(() => null);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ messages: typeof input === "string" ? [{ role: "user", content: input }] : input, json }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const code = await res.json().then((b: any) => b?.error as string | undefined).catch(() => undefined);
    if (res.status === 429) throw { code: code === "daily_limit" ? "daily_limit" : "rate_limited", message: "AI limit reached" } as AiError;
    if (res.status === 401) throw { code: "session_expired", message: "Sign in again" } as AiError;
    if (res.status === 503 || res.status === 404) throw { code: "unavailable", message: "AI endpoint not configured" } as AiError;
    throw { code: "upstream_error", message: `AI endpoint returned ${res.status}` } as AiError;
  }
  const data = await res.json();
  if (json) {
    const t: string = data.text ?? "";
    const m = t.match(/[[{][\s\S]*[\]}]/);
    if (!m) throw { code: "invalid_json", message: "No JSON in reply", text: t } as AiError;
    return JSON.parse(m[0]);
  }
  opts.onText?.(data.text);
  return data.text as string;
}

async function call(input: string | Turn[], json: boolean, opts: Opts = {}): Promise<any> {
  if (disabled) throw { code: "not_granted", message: "AI was declined for this page" } as AiError;
  const sample = await getSample();
  if (sample) {
    const options: any = {
      signal: opts.signal,
      modelTier: opts.quick ? "quick" : "default",
      ...(opts.fresh ? { cache: false } : {}),
      ...(opts.onText ? { onText: ({ text }: { text: string }) => opts.onText!(text) } : {}),
    };
    try {
      if (json) return await sample.json(input, options);
      const r = await sample(input, options);
      return r.text as string;
    } catch (e: any) {
      if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e?.code)) disabled = true;
      throw e as AiError;
    }
  }
  if (ENDPOINT) return viaEndpoint(input, json, opts);
  throw { code: "unavailable", message: "No AI connection" } as AiError;
}

export function aiErrorText(e: any): string {
  switch (e?.code) {
    case "cancelled": return "";
    case "not_granted": case "sampling_disabled": case "not_declared": case "capability_disabled": case "capability_removed":
      return "AI is turned off for this page. Reload the page to be asked again.";
    case "unavailable": return "AI isn’t set up yet. Add GROQ_API_KEY on the server (see README), then try again.";
    case "rate_limited": return "You’ve hit the AI usage limit for now. Try again in a little while.";
    case "session_expired": return "Your session expired. Sign out and sign in again, then retry.";
    case "daily_limit": return "You’ve used today’s AI requests. They reset tomorrow; everything else keeps working.";
    case "refused": return "The assistant couldn’t help with that request. Try rephrasing it.";
    case "invalid_json": return "The answer came back in an unexpected shape. Try again.";
    case "prompt_too_large": return "There’s too much text to send at once. Shorten your notes and try again.";
    default: return "The assistant didn’t respond. Try again.";
  }
}

// ---------- Context builders ----------

function profileBlock(p: Profile | null): string {
  if (!p) return "About me: (no profile yet)";
  return [
    `About me (the student): ${p.name}. ${p.headline}. School: ${p.school}.`,
    p.targetRoles.length ? `Target roles: ${p.targetRoles.join(", ")}.` : "",
    p.wishlist.length ? `Wishlist companies: ${p.wishlist.join(", ")}.` : "",
    p.skills.length ? `Skills: ${p.skills.join(", ")}.` : "",
    p.pitches.s30 ? `My 30-second pitch: "${p.pitches.s30}"` : "",
    `Preferred tone: ${TONE_LABEL[p.tone].title} (${TONE_LABEL[p.tone].hint}).`,
  ].filter(Boolean).join("\n");
}

function contactBlock(c: Contact): string {
  return [
    `Contact: ${c.name}, ${c.title}${c.company ? " at " + c.company : ""}.`,
    c.roleTypes.length ? `Relationship: ${c.roleTypes.map((r) => ROLE_LABEL[r]).join(", ")}.` : "",
    c.school ? `School connection: ${c.school}.` : "",
    `Met ${c.metVia === "event" ? "at" : "via"}: ${c.metAt || "unknown"}.`,
    c.goals.length ? `My goals with them: ${c.goals.map((g) => GOAL_LABEL[g]).join(", ")}.` : "",
    c.lastContact ? `Last contact: ${formatDate(c.lastContact)}.` : "",
    c.notes ? `My research notes:\n${c.notes.slice(0, 2500)}` : "",
  ].filter(Boolean).join("\n");
}

function notesBlock(notes: Note[]): string {
  if (!notes.length) return "Past notes: none yet.";
  return "Past notes (newest first):\n" + notes
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((n) => `- ${formatDate(n.date)} — ${n.headline}: ${n.body.slice(0, 600)}${n.nextStep ? ` (Next step: ${n.nextStep})` : ""}`)
    .join("\n");
}

const GROUND = "Use only the facts given here. You cannot browse the web, so never invent facts about the contact, their company, launches or talks; when something would need research, phrase it as a thing for me to look up.";

// ---------- Features ----------

export async function generatePrepBrief(c: Contact, p: Profile | null, notes: Note[], signal?: AbortSignal): Promise<PrepBrief> {
  const prompt = `You help a university student prepare for a networking coffee chat.
${GROUND}

${profileBlock(p)}

${contactBlock(c)}

${notesBlock(notes)}

Write a prep brief. Reply with only JSON in this shape:
{"opener": "one natural opening line I can say", "questions": ["3 specific, thoughtful questions"], "icebreakers": ["2-3 common-ground angles drawn from the facts above"], "agenda": [{"minutes": 5, "item": "..."}], "research": ["2-3 things I should look up before the chat"]}
The agenda should add up to about ${p?.durationMin ?? 30} minutes. Keep each item under 30 words.`;
  const r = await call(prompt, true, { signal });
  return {
    opener: String(r?.opener ?? ""),
    questions: (r?.questions ?? []).map(String).slice(0, 5),
    icebreakers: (r?.icebreakers ?? []).map(String).slice(0, 4),
    agenda: (r?.agenda ?? []).map((a: any) => ({ minutes: Number(a?.minutes) || 5, item: String(a?.item ?? "") })).slice(0, 6),
    research: (r?.research ?? []).map(String).slice(0, 4),
    generatedAt: new Date().toISOString(),
  };
}

export async function generateFollowUps(c: Contact, p: Profile | null, notes: Note[], signal?: AbortSignal): Promise<FollowUpIdeas> {
  const weeks = p?.followUpWeeks ?? 4;
  const prompt = `You help a university student keep a professional relationship warm after a coffee chat.
${GROUND}
Today is ${formatDate(todayISO())}.

${profileBlock(p)}

${contactBlock(c)}

${notesBlock(notes)}

Suggest 3 low-pressure follow-up touchpoints that connect back to what we discussed. Recommend a date about ${weeks} weeks after the last contact (or from today if none).
Reply with only JSON: {"recommendedDate": "YYYY-MM-DD", "ideas": [{"title": "short label", "message": "the 1-2 sentence message I could send", "why": "why this works, under 20 words"}]}`;
  const r = await call(prompt, true, { signal });
  return {
    recommendedDate: /^\d{4}-\d{2}-\d{2}$/.test(r?.recommendedDate) ? r.recommendedDate : todayISO(),
    ideas: (r?.ideas ?? []).slice(0, 3).map((i: any) => ({ title: String(i?.title ?? ""), message: String(i?.message ?? ""), why: String(i?.why ?? "") })),
    generatedAt: new Date().toISOString(),
  };
}

export async function draftThankYou(c: Contact, p: Profile | null, notes: Note[], kind: "thankyou" | "followup", onText?: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const task = kind === "thankyou"
    ? "Draft a short thank-you message to send within 24 hours of our coffee chat. Reference one or two specific things from my notes and any next step I committed to."
    : "Draft a short, friendly follow-up message to check back in a few weeks after our chat. Share a brief update related to their advice and keep it low-pressure.";
  const prompt = `${task}
${GROUND}

${profileBlock(p)}

${contactBlock(c)}

${notesBlock(notes)}

Write it in my voice using my preferred tone. 90–140 words. Start with "Hi ${c.name.split(" ")[0]}," and end with my first name${p ? ` (${p.name.split(" ")[0]})` : ""}. Reply with only the message text, no subject line and no commentary.`;
  return call(prompt, false, { onText, signal, fresh: true });
}

export async function tidyNotes(raw: string, c: Contact | undefined, signal?: AbortSignal): Promise<{ headline: string; body: string; nextStep: string }> {
  const prompt = `Turn my rough notes from a coffee chat${c ? ` with ${c.name} (${c.title}${c.company ? " at " + c.company : ""})` : ""} into a clean debrief.
Keep every fact I wrote, add nothing new. Reply with only JSON:
{"headline": "one-line summary under 12 words", "body": "3-6 short bullet lines starting with • covering key takeaways and advice", "nextStep": "the single most important next step for me, or empty string"}

My rough notes:
${raw.slice(0, 6000)}`;
  const r = await call(prompt, true, { signal, quick: true, fresh: true });
  return { headline: String(r?.headline ?? ""), body: String(r?.body ?? ""), nextStep: String(r?.nextStep ?? "") };
}

export async function refinePitch(p: Profile, length: "s30" | "s60" | "s120", signal?: AbortSignal, onText?: (t: string) => void): Promise<string> {
  const secs = length === "s30" ? 30 : length === "s60" ? 60 : 120;
  const words = Math.round(secs * 2.3);
  const prompt = `Write my ${secs}-second spoken self-introduction for networking coffee chats (about ${words} words).
${profileBlock(p)}
${p.resumeText ? `Resume highlights:\n${p.resumeText.slice(0, 3000)}` : ""}
${p.pitches[length] ? `My current draft to improve:\n${p.pitches[length]}` : ""}

It should sound natural when said out loud: who I am, what I’ve done that matters, what I’m exploring, and a light ask. Reply with only the pitch text.`;
  return call(prompt, false, { signal, onText, fresh: true });
}

export async function extractSkills(resume: string, signal?: AbortSignal): Promise<string[]> {
  const prompt = `From this resume text, list the 6-10 most marketable skills as short tags (2-4 words each).
Reply with only JSON in this shape: {"skills": ["..."]}

${resume.slice(0, 8000)}`;
  const r = await call(prompt, true, { signal, quick: true });
  const list = Array.isArray(r) ? r : Array.isArray(r?.skills) ? r.skills : [];
  return list.map(String).slice(0, 12);
}

export function assistantRules(c: Contact, p: Profile | null, notes: Note[], ev?: ChatEvent): string {
  return `You are NextCup, a friendly coffee-chat prep coach for a university student. Be concise: short paragraphs or up to 5 bullets. Plain text, no markdown headings.
${GROUND}

${profileBlock(p)}

${contactBlock(c)}
${ev ? `Upcoming chat: ${formatDate(ev.start)}, ${ev.durationMin} min${ev.topic ? `, topic: ${ev.topic}` : ""}.` : ""}

${notesBlock(notes)}`;
}

export async function chatTurn(turns: Turn[], onText: (t: string) => void, signal: AbortSignal): Promise<string> {
  return call(turns, false, { onText, signal, fresh: true });
}

/** Offline template used when AI is not available. */
export function templateThankYou(c: Contact, p: Profile | null, note?: Note): string {
  const first = c.name.split(" ")[0];
  const me = p?.name.split(" ")[0] ?? "";
  const topic = note?.headline ? ` especially ${note.headline.charAt(0).toLowerCase()}${note.headline.slice(1)}` : "";
  return `Hi ${first},

Thank you for taking the time to chat with me. I really appreciated your insights${topic}.${note?.nextStep ? `\n\nAs we discussed, I’ll ${note.nextStep.charAt(0).toLowerCase()}${note.nextStep.slice(1)}.` : ""}

I’d love to keep in touch and will share how things progress.

Best,
${me}`;
}
