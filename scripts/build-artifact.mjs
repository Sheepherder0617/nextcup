// Offline single-file build: esbuild (JS) + Tailwind v4 compile API (CSS) -> dist/nextcup.html
// Usage: node scripts/build-artifact.mjs   (set NODE_MODULES to where react/esbuild/tailwindcss live)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const NM = process.env.NODE_MODULES || path.resolve("node_modules");
const require = createRequire(path.join(NM, "_"));
const esbuild = require("esbuild");
const { compile } = await import(path.join(NM, "tailwindcss/dist/lib.mjs"));

const root = path.resolve(".");
const src = path.join(root, "src");

const js = await esbuild.build({
  entryPoints: [path.join(src, "main.tsx")],
  bundle: true, minify: true, format: "iife", target: "es2020", write: false,
  jsx: "automatic", nodePaths: [NM], legalComments: "none",
  loader: { ".css": "empty" },
  external: ["@supabase/supabase-js"], // only loaded when Supabase env vars are set, never in the Claude-hosted build
  define: { "process.env.NODE_ENV": '"production"', __AI_ENDPOINT__: JSON.stringify(process.env.VITE_AI_ENDPOINT || "") },
});
const bundle = js.outputFiles[0].text;

// Candidate tokens for Tailwind: everything that looks like a class in the sources.
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && files.push(p); } })(src);
const candidates = new Set();
for (const f of files) for (const t of fs.readFileSync(f, "utf8").split(/[\s"'`{}<>;=]+/)) if (t && t.length < 200) candidates.add(t);

const twRoot = path.join(NM, "tailwindcss");
const compiler = await compile(fs.readFileSync(path.join(src, "index.css"), "utf8"), {
  base: src,
  loadStylesheet: async (id, base) => {
    const p = id === "tailwindcss" ? path.join(twRoot, "index.css") : id.startsWith("tailwindcss/") ? path.join(twRoot, id.slice(12)) : path.resolve(base, id);
    return { content: fs.readFileSync(p, "utf8"), base: path.dirname(p), path: p };
  },
});
let css = compiler.build([...candidates]);
css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n");

const fonts = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Plus+Jakarta+Sans:wght@400..800&display=swap";
const icons = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block";

const html = `<title>NextCup</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Coffee chat tracker: prep, debrief and follow up with your network.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<link rel="stylesheet" href="${icons}">
<style>${css}</style>
<div id="root"></div>
<script>${bundle.replace(/<\/script/gi, "<\\/script")}</script>
`;
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/nextcup.html"), html);
console.log(`dist/nextcup.html  ${(html.length / 1024).toFixed(0)} KB  (js ${(bundle.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB)`);
