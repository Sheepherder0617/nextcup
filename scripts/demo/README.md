# Landing page demo video

Re-records `public/landing/demo.mp4`, `demo.webm` and `demo-poster.webp` from the real app.

- `seed.cjs`: made-up contacts, chats and notes (dates relative to today)
- `server.cjs`: serves a built copy of the app and answers `/api/ai` with fixed example replies, so every recording is the same and uses no Groq quota
- `record.cjs`: Playwright script that clicks through the tour (`stills` for screenshots, `video` to record)
- `make-video.sh`: records, then encodes MP4 + WebM + poster with ffmpeg

It expects a single-file build of the app in `scripts/demo/site/index.html` (with `VITE_AI_ENDPOINT=/api/ai`) and the fonts in `site/fonts/`.
After re-recording, update the chapter times (`TOUR[].at`) in `src/pages/Landing.tsx` from the printed marks (minus 0.6 s trim).
