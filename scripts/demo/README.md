# Landing page demo video

Re-records `public/landing/demo.mp4`, `demo.webm` and `demo-poster.webp` from the real app.

- `seed.cjs`: made-up contacts, chats and notes (dates relative to today)
- `server.cjs`: serves a built copy of the app and answers `/api/ai` with fixed example replies, so every recording is the same and uses no Groq quota
- `record.cjs`: Playwright script that clicks through the tour (`stills` for screenshots, `video` to capture 1.5x frames via the Chrome screencast and log click times)
- `build-av.py`: turns the frames into video, synthesizes click / typing / chime sounds at the logged times, mixes them over `music.mp3` ("Sunny Cafe" nu-jazz by Alex Morgan, Pixabay Content License) and encodes MP4 + WebM + poster

It expects a single-file build of the app in `scripts/demo/site/index.html` (with `VITE_AI_ENDPOINT=/api/ai`) and the fonts in `site/fonts/`.
After re-recording, update the chapter times (`TOUR[].at`) in `src/pages/Landing.tsx` from the printed marks (`build-av.py` prints them; add about 1–2 s where a page needs to load).
