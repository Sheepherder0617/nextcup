import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** In `npm run dev`, serve POST /api/ai locally with the same code Vercel runs in production. */
function devAiEndpoint(env: Record<string, string>): Plugin {
  return {
    name: "nextcup-dev-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai", async (req, res) => {
        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(payload));
        };
        if (req.method !== "POST") return send(405, { error: "POST only" });
        let raw = "";
        for await (const chunk of req) raw += chunk;
        try {
          const { messages, json } = JSON.parse(raw || "{}");
          const mod = await server.ssrLoadModule("/api/ai.ts");
          const merged = { ...process.env, ...env };
          await mod.authorize(req.headers.authorization as string | undefined, merged);
          const text = await mod.complete(messages, !!json, merged);
          send(200, { text });
        } catch (e: any) {
          console.error("[dev /api/ai]", e?.message);
          const status = e?.status ?? 500;
          const mod = await server.ssrLoadModule("/api/ai.ts").catch(() => null);
          send(status, { error: mod ? mod.errorCode(status, e?.message) : "ai_unavailable" });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // reads .env.local (GROQ_API_KEY) for local dev
  return {
    plugins: [react(), tailwindcss(), devAiEndpoint(env)],
    define: {
      // Where the browser sends AI requests. Same origin on Vercel and in dev.
      __AI_ENDPOINT__: JSON.stringify(env.VITE_AI_ENDPOINT ?? "/api/ai"),
    },
  };
});
