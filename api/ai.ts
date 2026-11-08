// Vercel serverless function: POST /api/ai  { messages: [{role, content}], json?: boolean } -> { text }
// Keeps your Anthropic API key on the server. Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables,
// and VITE_AI_ENDPOINT=/api/ai so the front end calls it.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { messages, json } = req.body ?? {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages required" });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
      max_tokens: 1500,
      system: json ? "Reply with only valid JSON, no prose and no code fences." : undefined,
      messages: messages.slice(-12).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 20000) })),
    }),
  });
  if (!r.ok) return res.status(502).json({ error: `Anthropic API ${r.status}` });
  const data = await r.json();
  const text = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return res.status(200).json({ text });
}
