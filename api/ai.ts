// AI endpoint: POST /api/ai  { messages: [{role, content}], json?: boolean }  ->  { text }
// Runs on the server (Vercel function in production, Vite middleware in `npm run dev`),
// so the API key never reaches the browser.
//
// Provider: Groq (OpenAI-compatible). Set these environment variables:
//   GROQ_API_KEY   required — from console.groq.com → API Keys
//   GROQ_MODEL     optional — defaults to openai/gpt-oss-120b

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export class AiHttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Calls Groq and returns the reply text. Shared by the Vercel function and the dev server. */
export async function complete(messages: Msg[], json: boolean, env: Record<string, string | undefined> = process.env): Promise<string> {
  const key = env.GROQ_API_KEY;
  if (!key) throw new AiHttpError(503, "GROQ_API_KEY is not set on the server");

  const body: Record<string, unknown> = {
    model: env.GROQ_MODEL || DEFAULT_MODEL,
    temperature: 0.6,
    max_completion_tokens: 2000,
    messages: [
      {
        role: "system",
        content: json
          ? "You are NextCup's assistant. Reply with only one valid JSON object, no prose and no code fences."
          : "You are NextCup's assistant. Reply in plain text without markdown headings.",
      },
      ...messages.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 20000) })),
    ],
  };
  if (json) body.response_format = { type: "json_object" };

  const send = (b: Record<string, unknown>) =>
    fetch(GROQ_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(b) });

  let r = await send(body);
  // If JSON mode is rejected for this model or reply, retry once without it (the prompt still asks for JSON).
  if (!r.ok && json && r.status === 400) {
    delete body.response_format;
    r = await send(body);
  }
  if (r.status === 429) throw new AiHttpError(429, "Groq rate limit reached");
  if (!r.ok) throw new AiHttpError(502, `Groq API error ${r.status}: ${(await r.text()).slice(0, 300)}`);

  const data: any = await r.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}

// Vercel serverless function
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { messages, json } = req.body ?? {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages required" });
  try {
    const text = await complete(messages, !!json);
    return res.status(200).json({ text });
  } catch (e: any) {
    const status = e instanceof AiHttpError ? e.status : 500;
    console.error("[api/ai]", e?.message);
    return res.status(status).json({ error: status === 429 ? "rate_limited" : "ai_unavailable" });
  }
}
