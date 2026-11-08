import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Where the browser sends AI requests when not running inside Claude. On Vercel: "/api/ai".
    __AI_ENDPOINT__: JSON.stringify(process.env.VITE_AI_ENDPOINT ?? ""),
  },
});
