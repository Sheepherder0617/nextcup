import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Button, Icon, cx } from "../components/ui";
import { Wordmark } from "../components/Logo";

// Illustrations live in public/landing (optimised .webp, transparent backgrounds).
const IMG = (name: string) => `/landing/${name}.webp`;

// Hero story, in three acts that loop: meet again → blank on details → one tap brings it back.
const ACTS = [
  { label: "Hi again!", ms: 3200 },
  { label: "Oops…", ms: 3600 },
  { label: "Oh right!", ms: 6000 },
] as const;

const PAINS = [
  { icon: "folder_off", text: "Notes scattered across apps" },
  { icon: "schedule", text: "No reminder until it feels awkward" },
  { icon: "edit_off", text: "Every follow-up starts from scratch" },
];


// Feature showcase: each feature has a still screenshot of the real app (made-up demo data).
const FEATURES = [
  { img: "feat-log", icon: "timeline", title: "Remember every conversation", text: "Every chat and note in one timeline." },
  { img: "feat-followup", icon: "auto_awesome", title: "Get AI-tailored follow-ups", text: "AI drafts the message and picks the moment." },
  { img: "feat-calendar", icon: "calendar_month", title: "Never miss a check-in", text: "Chats, thank-yous and check-ins, with reminders." },
  { img: "feat-debrief", icon: "edit_note", title: "Organize messy notes", text: "Rough notes in, clear takeaways out." },
];

const PRIVACY = [
  { img: "privacy-lock", title: "Private by default", text: "Only you can see your contacts and notes." },
  { img: "privacy-ai", title: "AI only when you ask", text: "Your notes are only shared with our AI provider when you press an AI button." },
  { img: "privacy-export", title: "Export or delete anytime", text: "Download all your data, or erase it in one click from your profile." },
];

export function Landing() {
  const { profile } = useStore();
  const { go } = useNav();
  const start = () => go(profile ? "dashboard" : "signup");
  const signIn = () => go(profile ? "dashboard" : "signin");

  return (
    <div className="min-h-full flex flex-col bg-card">
      <header className="gutter border-b border-line bg-card/90 backdrop-blur sticky z-40" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto max-w-[1180px] h-16 md:h-[72px] flex items-center justify-between gap-3">
          <a href="#welcome" className="rounded-xl"><span className="sm:hidden"><Wordmark compact /></span><span className="hidden sm:block"><Wordmark /></span></a>
          <div className="flex items-center gap-1.5 md:gap-2">
            {!profile && <Button variant="ghost" size="sm" onClick={signIn} className="rounded-full h-9 md:px-4">Sign in</Button>}
            <Button variant="primary" size="sm" onClick={start} className="rounded-full h-9 px-4">{profile ? "Open app" : "Start for free"}</Button>
          </div>
        </div>
      </header>

      <Hero onStart={start} signedIn={!!profile} />

      {/* ---------- Problem ---------- */}
      <section className="gutter bg-card-2 border-y border-line">
        <div className="mx-auto max-w-[1180px] py-14 md:py-20 grid gap-8 md:gap-14 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center">
          <img src={IMG("problem")} alt="A student at a desk looking at their phone, trying to remember someone, surrounded by faded notes" loading="lazy"
            className="w-full max-w-[300px] md:max-w-[440px] mx-auto" width={900} height={900} />
          <div className="flex flex-col gap-4">
            <SectionLabel>Why connections fade</SectionLabel>
            <h2 className="font-serif font-medium text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em]">You meet great people. Then life happens.</h2>
            <p className="text-fg-2 text-[16px] md:text-[17px] max-w-[56ch]">
              Great chat. You promise to keep in touch.<br />Six weeks later, you only remember their first name.
            </p>
            <ul className="flex flex-col gap-2.5 mt-1">
              {PAINS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-fg-2">
                  <span className="grid place-items-center shrink-0 w-8 h-8 rounded-lg bg-card border border-line text-brand"><Icon name={p.icon} className="text-[18px]" /></span>
                  <span className="pt-1">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- How it works: demo video ---------- */}
      <Demo />

      {/* ---------- Features: still screenshots ---------- */}
      <Features />

      {/* ---------- Privacy ---------- */}
      <section className="gutter">
        <div className="mx-auto max-w-[1180px] py-10 md:py-14">
          <div className="flex flex-col items-center text-center gap-2 mb-6 md:mb-8">
            <SectionLabel>Your data, your network</SectionLabel>
            <h2 className="font-serif font-medium text-[26px] md:text-[34px] leading-[1.1] tracking-[-0.015em]">Your network belongs to you.</h2>
          </div>
          <div className="grid gap-3 md:gap-4 md:grid-cols-3 max-w-[1100px] mx-auto">
            {PRIVACY.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-card-2 p-4 md:p-5 flex items-center gap-4">
                <img src={IMG(p.img)} alt="" loading="lazy" width={360} height={360} className="w-16 h-16 md:w-20 md:h-20 shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-[16px] md:text-[17px] font-semibold">{p.title}</h3>
                  <p className="text-fg-2 text-[14px]">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="gutter pb-10 md:pb-14">
        <div className="mx-auto max-w-[1100px] rounded-3xl bg-ink text-on-ink px-6 py-8 md:px-10 md:py-9 flex flex-col md:flex-row items-center text-center md:text-left gap-4 md:gap-8">
          <div className="flex-1 flex flex-col gap-1.5">
            <h2 className="font-serif font-medium text-[24px] md:text-[30px] leading-[1.15] tracking-[-0.01em]">The next coffee chat could be the start of something big.</h2>
            <p className="opacity-80 text-[15px]">Make sure it isn’t the last one.</p>
          </div>
          <button type="button" onClick={start}
            className="shrink-0 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-on-ink text-ink font-semibold text-[15px] hover:opacity-90 transition">
            {profile ? "Open your workspace" : "Start for free"}<Icon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </section>

      <footer className="gutter border-t border-line mt-auto">
        <p className="mx-auto max-w-[1180px] py-8 text-center text-[13px] text-fg-3">NextCup · Built by the <span className="catalysts-shine">CATalysts</span> at Rotman, in Toronto.</p>
      </footer>
    </div>
  );
}

/** The app name in the headline: italic terracotta, as in the original Stitch hero. */
function BrandWord() {
  return <em className="text-brand whitespace-nowrap">NextCup.</em>;
}

/** "warm", with a slow glowing gradient and coffee steam rising from it. */
function WarmWord() {
  // Illustrated steam: three tapered, gently curling wisps that fade toward the top and rise out of sync.
  const wisps = [
    { d: "M14 58 C6 48, 22 40, 14 30 S 6 14, 16 4", w: 4.2, dur: 4.2, delay: 0 },
    { d: "M31 58 C39 50, 23 42, 31 32 S 41 18, 33 8", w: 4.8, dur: 3.6, delay: 1.3 },
    { d: "M50 58 C45 52, 55 46, 50 38 S 47 28, 52 22", w: 3.6, dur: 3.2, delay: 2.4 },
  ];
  return (
    <span className="relative inline-block">
      <svg aria-hidden="true" viewBox="0 0 60 60" className="absolute left-1/2 -translate-x-1/2 bottom-[80%] w-[0.9em] h-[0.9em] overflow-visible">
        <defs>
          <linearGradient id="steam-fade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="var(--brand-2)" stopOpacity="0" />
            <stop offset=".18" stopColor="var(--brand-2)" stopOpacity=".55" />
            <stop offset=".6" stopColor="var(--brand-2)" stopOpacity=".3" />
            <stop offset="1" stopColor="var(--brand-2)" stopOpacity="0" />
          </linearGradient>
          <filter id="steam-soft" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation=".7" /></filter>
        </defs>
        <g filter="url(#steam-soft)">
          {wisps.map((w) => (
            <path key={w.d} d={w.d} className="warm-steam" stroke="url(#steam-fade)" strokeWidth={w.w}
              style={{ animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s` }} />
          ))}
        </g>
      </svg>
      <span className="warm-text">warm</span>
    </span>
  );
}

function BrowserBar({ children }: { children?: ReactNode }) {
  return (
    <div aria-hidden={children ? undefined : true} className="relative h-8 md:h-9 px-3 flex items-center gap-1.5 border-b border-line bg-header">
      <span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-line-2" />
      <span className="ml-3 flex-1 max-w-[260px] h-5 rounded-md bg-sunken text-[11px] text-fg-3 grid place-items-center">NextCup</span>
      {children}
    </div>
  );
}

function Demo() {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);

  // Play only while the demo is on screen (saves data and battery); never autoplay for reduced motion.
  useEffect(() => {
    const v = video.current;
    if (!v || reduced || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  // Browsers only autoplay muted video, so sound is opt-in.
  function toggleSound() {
    const v = video.current;
    if (!v) return;
    v.muted = sound;
    setSound(!sound);
    if (!sound) v.play().catch(() => {});
  }

  return (
    <section id="how" className="gutter bg-card-2 border-y border-line">
      <div className="mx-auto max-w-[1180px] py-14 md:py-20">
        <div className="flex flex-col items-center text-center gap-3 mb-8 md:mb-10">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="font-serif font-medium text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em] max-w-[22ch]">Meet once. Stay connected for good.</h2>
        </div>
        <figure id="demo" className="mx-auto max-w-[980px] rounded-2xl border border-line-2 bg-card shadow-lift overflow-hidden">
          <BrowserBar>
            <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute demo" : "Play demo with sound"}
              className="absolute right-2 top-1 md:top-1.5 inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-ink text-on-ink text-[12px] font-semibold hover:opacity-90 transition">
              <Icon name={sound ? "volume_up" : "volume_off"} className="text-[15px]" />{sound ? "Sound on" : "Turn on sound"}
            </button>
          </BrowserBar>
          <video ref={video} poster={IMG("demo-poster")} muted playsInline loop preload="metadata"
            controls={reduced} width={1280} height={800} className="block w-full h-auto bg-card"
            aria-label="Screen recording of NextCup: a contact's history, AI follow-up ideas, the calendar, and turning rough notes into a debrief.">
            <source src="/landing/demo.webm" type="video/webm" />
            <source src="/landing/demo.mp4" type="video/mp4" />
          </video>
        </figure>
        <p className="mt-4 text-center text-[12px] text-fg-3">Demo with made-up contacts.</p>
      </div>
    </section>
  );
}

function Features() {
  const [active, setActive] = useState(0);
  const shot = (i: number, eager = false) => (
    <img src={IMG(FEATURES[i].img)} alt={`NextCup screen: ${FEATURES[i].title}`} width={1600} height={1000}
      loading={eager ? "eager" : "lazy"} className="block w-full h-auto" />
  );
  return (
    <section className="gutter">
      <div className="mx-auto max-w-[1180px] py-14 md:py-20">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-3 mb-8 md:mb-10">
          <SectionLabel>Features</SectionLabel>
          <h2 className="font-serif font-medium text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em] max-w-[20ch]">Everything you need to keep in touch.</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
          <ul className="flex flex-col gap-2.5" aria-label="Features">
            {FEATURES.map((f, i) => {
              const open = active === i;
              return (
                <li key={f.title} className={cx("rounded-2xl border transition", open ? "bg-card-2 border-line-2 shadow-soft" : "border-line hover:bg-card-2/60")}>
                  <button type="button" onClick={() => setActive(i)} aria-expanded={open}
                    className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 md:px-5 md:py-4 rounded-2xl">
                    <span className={cx("grid place-items-center shrink-0 w-10 h-10 rounded-xl transition", open ? "bg-ink text-on-ink" : "bg-peach text-on-peach")}>
                      <Icon name={f.icon} className="text-[20px]" />
                    </span>
                    <span className="flex-1 text-[16px] md:text-[17px] font-semibold">{f.title}</span>
                    <span className="lg:hidden flex"><Icon name="expand_more" className={cx("text-[22px] text-fg-3 transition-transform", open && "rotate-180")} /></span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 md:px-5 md:pb-5 -mt-1 flex flex-col gap-3 rise">
                      <p className="text-fg-2 text-[15px] lg:pl-[54px]">{f.text}</p>
                      {/* Phone: the screenshot sits inside the open item */}
                      <div className="lg:hidden rounded-xl border border-line overflow-hidden">{shot(i)}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {/* Desktop: one framed screenshot that follows the selected feature */}
          <figure className="hidden lg:block rounded-2xl border border-line-2 bg-card shadow-lift overflow-hidden lg:sticky lg:top-24">
            <BrowserBar />
            <div className="grid">
              {FEATURES.map((f, i) => (
                <div key={f.img} className={cx("[grid-area:1/1] transition-opacity duration-500", active === i ? "opacity-100" : "opacity-0")} aria-hidden={active !== i}>
                  {shot(i, i === 0)}
                </div>
              ))}
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label-caps text-brand">{children}</p>;
}

// ---------- Hero ----------

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function Hero({ onStart, signedIn }: { onStart: () => void; signedIn: boolean }) {
  const reduced = useReducedMotion();
  const [act, setAct] = useState(0);
  // Reduced motion: no autoplay and start on the final act, but still let people step through by tap or swipe.
  const [picked, setPicked] = useState(false);
  const shown = reduced && !picked ? 2 : act;
  const pick = (i: number) => { setPicked(true); setAct((i + ACTS.length) % ACTS.length); };
  // Swipe left for the next act, right for the previous one. Vertical drags are left to page scrolling.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setAct((a) => (a + 1) % ACTS.length), ACTS[act].ms);
    return () => clearTimeout(t);
  }, [act, reduced]);

  return (
    <section className="gutter relative overflow-hidden dot-grid">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(45% 60% at 80% 40%, color-mix(in oklab, var(--peach) 55%, transparent), transparent 70%), radial-gradient(35% 50% at 10% 80%, color-mix(in oklab, var(--blue-soft) 55%, transparent), transparent 70%)" }} />
      <div className="relative mx-auto max-w-[1180px] pt-8 pb-12 md:pt-10 md:pb-16 lg:pt-12 grid gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
        <div className="flex flex-col gap-5 text-center lg:text-left items-center lg:items-start">
          <p className="font-sans font-semibold text-[clamp(13px,3.9vw,16px)] md:text-[20px] lg:text-[22px] leading-snug tracking-[-0.005em] whitespace-nowrap">
            <span className="font-normal text-fg-3">Not a coffee chat tracker.</span>{" "}
            <span className="font-bold text-brand">A relationship keeper.</span>
          </p>
          {/* Fixed line breaks keep "connections warm" together so the steam never overlaps the line above. */}
          <h1 className="font-serif font-medium text-[clamp(30px,9.2vw,40px)] leading-[1.06] md:text-[58px] lg:text-[50px] xl:text-[60px] tracking-[-0.02em] whitespace-nowrap">
            Keep your<br />connections <WarmWord /><br />with <BrandWord />
          </h1>
          <p className="text-fg-2 text-[16px] md:text-[18px] max-w-[48ch]">
            NextCup remembers what you talked about, reminds you when to reach out, and suggests what to say, so connections last for years.
          </p>
          <div className="flex flex-row flex-wrap justify-center lg:justify-start items-center gap-x-4 gap-y-2 sm:gap-5 mt-1">
            <Button variant="primary" size="lg" iconRight="arrow_forward" onClick={onStart} className="rounded-full px-5 sm:px-7">
              {signedIn ? "Open your workspace" : "Start for free"}
            </Button>
            <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById("demo")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); }}
              className="text-[15px] font-semibold text-fg-2 hover:text-fg rounded-md">See how it works ↓</a>
          </div>
        </div>

        <div className="relative w-full max-w-[640px] mx-auto">
          <div className="touch-pan-y select-none"
            onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
            onPointerCancel={() => { swipe.current = null; }}
            onPointerUp={(e) => {
              const s = swipe.current; swipe.current = null;
              if (!s) return;
              const dx = e.clientX - s.x, dy = e.clientY - s.y;
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) pick(shown + (dx < 0 ? 1 : -1));
            }}>
            <Stage act={shown} />
          </div>
          {/* Desktop/tablet: a compact card pops up above their heads, like a shared memory, without hiding their faces */}
          <div className={cx("hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-[min(340px,62%)] transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
            shown === 2 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none")}>
            <MemoryCard />
          </div>
          <Steps act={shown} onPick={pick} auto={!reduced} className="mt-4" />
          {/* Phone: the card appears below the steps, so the step labels stay readable */}
          <div className="md:hidden mt-4">
            <div className={cx("transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
              shown === 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
              <ContactCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stage({ act }: { act: number }) {
  const scenes = ["hero-1", "hero-2", "hero-3"];
  return (
    <div className="relative w-full aspect-[3/2.1]" role="img"
      aria-label="Two young professionals meet again at a career fair. Neither remembers the details, so he scratches his head and she checks her phone. Then they both remember and happily pick up the conversation.">
      {/* Scenes fade into the page on the sides and bottom */}
      <div className="absolute inset-x-0 bottom-0 aspect-[3/2] [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent),linear-gradient(to_top,transparent,#000_8%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]">
        {scenes.map((n, i) => (
          <img key={n} src={IMG(n)} alt="" draggable={false} width={1400} height={933} fetchPriority={i === 0 ? "high" : undefined}
            className={cx("absolute inset-0 w-full h-full transition-opacity duration-700", act === i ? "opacity-100" : "opacity-0")} />
        ))}
      </div>
      {/* Act 2: she is searching ("typing" dots), he is trying to remember */}
      <Thought show={act === 1} className="left-[20%] top-[14%] md:top-[16%]" tail="left-[60%]" delay={200}>
        <span className="typing-bounce inline-flex items-center gap-1 px-1 py-1">
          <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-fg-3" /><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-fg-3" /><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-fg-3" />
        </span>
      </Thought>
      <Thought show={act === 1} className="right-[1%] -top-[4%] md:top-[5%] w-[46%] md:w-[40%]" tail="left-[30%]" delay={700}>When did we last talk…?</Thought>
    </div>
  );
}

function Thought({ show, className, tail, delay, children }: { show: boolean; className: string; tail: string; delay: number; children: ReactNode }) {
  return (
    <div aria-hidden="true" style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
      className={cx("absolute transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]", show ? "opacity-100 scale-100" : "opacity-0 scale-90", className)}>
      <div className="rounded-[22px] bg-card border border-line-2 shadow-soft px-3 py-2 md:px-4 md:py-2.5 text-center text-[12px] leading-[1.3] md:text-[14px] font-medium text-fg">
        {children}
      </div>
      <span className={cx("absolute -bottom-3 w-3 h-3 rounded-full bg-card border border-line-2", tail)} />
      <span className={cx("absolute -bottom-[22px] ml-2 w-2 h-2 rounded-full bg-card border border-line-2", tail)} />
    </div>
  );
}

function Steps({ act, onPick, auto, className }: { act: number; onPick: (i: number) => void; auto: boolean; className?: string }) {
  const emoji = ["👋", "😅", "💡"];
  return (
    <div role="tablist" aria-label="The story" className={cx("grid grid-cols-3 gap-1 p-1 rounded-full bg-sunken border border-line", className)}>
      {ACTS.map((a, i) => {
        const on = act === i;
        return (
          <button key={a.label} type="button" role="tab" aria-selected={on} onClick={() => onPick(i)}
            className={cx("relative overflow-hidden h-11 md:h-12 rounded-full flex items-center justify-center gap-1.5 text-[13px] md:text-[15px] font-semibold transition-colors",
              on ? "bg-ink text-on-ink shadow-soft" : "text-fg-2 hover:bg-card hover:text-fg")}>
            {/* While auto-playing, the active pill fills up to show when the next act comes */}
            {on && auto && <span key={act} aria-hidden="true" className="step-fill absolute inset-y-0 left-0 bg-white/15" style={{ animationDuration: `${a.ms}ms` }} />}
            <span aria-hidden="true" className="relative text-[15px] md:text-[17px] leading-none">{emoji[i]}</span>
            <span className="relative whitespace-nowrap">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Mock contact card for the hero. The person is fictional and labelled as an example. */
/** Compact version of the example card for the hero scene. */
function MemoryCard() {
  return (
    <div className="rounded-2xl bg-card/95 backdrop-blur border border-line-2 shadow-lift px-3.5 py-3 flex flex-col gap-2 text-left">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-9 h-9 rounded-full bg-blue-soft text-on-blue-soft font-semibold text-[13px] shrink-0">ML</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[14px] leading-tight">Marcus Lee <span className="font-normal text-fg-3">· PM, fintech</span></p>
          <p className="text-[12px] text-fg-2 flex items-center gap-1"><Icon name="history" className="text-[14px] text-brand" />Last chat: Sep 18, 7 weeks ago</p>
        </div>
        <span className="label-caps !text-[9px] text-fg-3 border border-line rounded-full px-1.5 py-0.5">Example</span>
      </div>
      <p className="rounded-lg ai-glow border border-line px-2.5 py-1.5 text-[12.5px]"><span className="font-semibold text-on-peach">Ask: </span>“How did the intern demo day go?”</p>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="rounded-2xl bg-card border border-line-2 shadow-lift p-4 flex flex-col gap-3 text-left">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-full bg-blue-soft text-on-blue-soft font-semibold text-[15px] shrink-0">ML</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[15px] leading-tight">Marcus Lee</p>
          <p className="text-[12px] text-fg-3 truncate">Product Manager · fintech startup</p>
        </div>
        <span className="label-caps !text-[10px] text-fg-3 border border-line rounded-full px-2 py-0.5">Example</span>
      </div>
      <div className="rounded-xl bg-card-2 px-3 py-2 flex items-center gap-2 text-[13px]">
        <Icon name="history" className="text-[18px] text-brand" />
        <span><b className="font-semibold">Last coffee chat:</b> Sep 18 · 7 weeks ago</span>
      </div>
      <dl className="flex flex-col gap-2 text-[13px]">
        <div><dt className="text-fg-3 text-[12px]">You talked about</dt><dd>Switching from analytics to product, his team’s intern project</dd></div>
        <div><dt className="text-fg-3 text-[12px]">You promised</dt><dd className="flex items-center gap-1.5">Send your dbt case study <span className="inline-flex items-center gap-0.5 text-blue font-semibold"><Icon name="check_circle" fill className="text-[16px]" />Done</span></dd></div>
      </dl>
      <div className="rounded-xl ai-glow border border-line px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-on-peach"><Icon name="auto_awesome" className="text-[16px]" />Suggested opener</p>
        <p className="text-[14px] font-medium mt-0.5">“How did the intern demo day go?”</p>
      </div>
      <span aria-hidden="true" className="h-9 rounded-lg bg-ink text-on-ink text-[13px] font-semibold grid place-items-center">Follow up now</span>
    </div>
  );
}
