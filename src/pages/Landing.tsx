import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Button, Icon, cx } from "../components/ui";
import { Wordmark } from "../components/Logo";

// Illustrations live in public/landing (optimised .webp, transparent backgrounds).
const IMG = (name: string) => `/landing/${name}.webp`;

// Hero story, in three acts that loop: meet again → blank on details → one tap brings it back.
const ACTS = [
  { label: "You meet again", ms: 3600 },
  { label: "You both blank", ms: 2400 },
  { label: "One tap, it’s all back", ms: 6000 },
] as const;

const PAINS = [
  { icon: "folder_off", text: "Notes scattered across your Notes app, Excel and DMs" },
  { icon: "schedule", text: "No reminder until it already feels awkward to reach out" },
  { icon: "edit_off", text: "Starting every follow-up from a blank message" },
];

const STEPS = [
  { n: "1", title: "Meet", text: "Add someone in seconds after any event or intro." },
  { n: "2", title: "Remember", text: "Jot rough notes. AI turns them into takeaways." },
  { n: "3", title: "Reconnect", text: "Get reminded to follow up, with a draft ready." },
];

// Product tour: one silent screen recording (fictional demo data) with clickable chapters.
// `at` is where each chapter starts in public/landing/demo.mp4, in seconds.
const TOUR = [
  { at: 0, icon: "timeline", title: "Every conversation, remembered", text: "Each contact keeps a timeline of chats, notes and messages. Glance at it before you say hi." },
  { at: 7.1, icon: "auto_awesome", title: "Follow-ups written for you", text: "AI picks a good moment to reach out and drafts messages from what you discussed." },
  { at: 19.2, icon: "calendar_month", title: "One calendar for every touchpoint", text: "Coffee chats, thank-you notes and check-ins in one timeline, with reminders." },
  { at: 23.4, icon: "edit_note", title: "Messy notes, clean debrief", text: "Jot rough notes after a chat. AI turns them into clear takeaways." },
];

const PRIVACY = [
  { img: "privacy-lock", title: "Private by default", text: "Only you can see your contacts and notes." },
  { img: "privacy-ai", title: "AI only when you ask", text: "Your notes are only shared with our AI provider when you press an AI button." },
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
              A coffee chat goes well. You swap LinkedIns, promise to keep in touch, and mean it. Six weeks later you run into them at an event, and all you remember is their first name. The advice they gave, the article they recommended, the thing you said you’d send: gone.
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

      {/* ---------- How it works: three steps + product tour ---------- */}
      <Tour />

      {/* ---------- Privacy ---------- */}
      <section className="gutter">
        <div className="mx-auto max-w-[1180px] py-14 md:py-20">
          <div className="flex flex-col items-center text-center gap-3 mb-8 md:mb-12">
            <SectionLabel>Your data, your network</SectionLabel>
            <h2 className="font-serif font-medium text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em]">Your network belongs to you.</h2>
          </div>
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 max-w-[820px] mx-auto">
            {PRIVACY.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-card-2 p-5 md:p-7 flex md:flex-col items-center md:text-center gap-4">
                <img src={IMG(p.img)} alt="" loading="lazy" width={360} height={360} className="w-20 h-20 md:w-36 md:h-36 shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h3 className="text-[18px] font-semibold">{p.title}</h3>
                  <p className="text-fg-2 text-[15px]">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="gutter pb-14 md:pb-20">
        <div className="mx-auto max-w-[1180px] rounded-3xl bg-ink text-on-ink px-6 py-12 md:px-12 md:py-16 flex flex-col items-center text-center gap-4">
          <h2 className="font-serif font-medium text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.015em] max-w-[24ch]">The next coffee chat could be the start of something big.</h2>
          <p className="opacity-80 text-[16px] md:text-[18px]">Make sure it isn’t the last one.</p>
          <button type="button" onClick={start}
            className="mt-2 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-on-ink text-ink font-semibold text-[15px] hover:opacity-90 transition">
            {profile ? "Open your workspace" : "Start for free"}<Icon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </section>

      <footer className="gutter border-t border-line mt-auto">
        <p className="mx-auto max-w-[1180px] py-8 text-center text-[13px] text-fg-3">NextCup · Built by the CATalysts at Rotman, in Toronto.</p>
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
  return (
    <span className="relative inline-block">
      <svg aria-hidden="true" viewBox="0 0 60 40" className="absolute left-1/2 -translate-x-1/2 bottom-[78%] w-[0.95em] h-[0.62em] overflow-visible">
        {["M14 38c-6-8 6-12 0-20s4-12 0-18", "M30 38c-6-8 6-12 0-20s4-12 0-18", "M46 38c-6-8 6-12 0-20s4-12 0-18"].map((d, i) => (
          <path key={d} d={d} className="warm-steam" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
      </svg>
      <span className="warm-text">warm</span>
    </span>
  );
}

function Tour() {
  const reduced = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);

  // Play only while the tour is on screen (saves data and battery); never autoplay for reduced motion.
  useEffect(() => {
    const v = video.current;
    if (!v || reduced || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  function onTime() {
    const t = video.current?.currentTime ?? 0;
    let i = 0;
    TOUR.forEach((c, k) => { if (t >= c.at) i = k; });
    if (i !== active) setActive(i);
  }
  function jump(i: number) {
    const v = video.current;
    setActive(i);
    if (!v) return;
    v.currentTime = TOUR[i].at + 0.05;
    v.play().catch(() => {});
  }

  return (
    <section id="how" className="gutter bg-card-2 border-y border-line">
      <div className="mx-auto max-w-[1180px] py-14 md:py-20">
        <div className="flex flex-col items-center text-center gap-3 mb-6 md:mb-8">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="font-serif font-medium text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.015em] max-w-[22ch]">Meet once. Stay connected for good.</h2>
        </div>
        <ol className="grid grid-cols-3 rounded-2xl border border-line bg-card divide-x divide-line mb-8 md:mb-12 max-w-[900px] mx-auto">
          {STEPS.map((s) => (
            <li key={s.n} className="p-3 md:p-5 flex flex-col gap-1 md:gap-1.5">
              <span className="flex items-center gap-1.5 md:gap-2.5">
                <span className="grid place-items-center shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-ink text-on-ink font-serif text-[13px] md:text-[16px] font-semibold">{s.n}</span>
                <span className="text-[14px] md:text-[17px] font-semibold">{s.title}</span>
              </span>
              <span className="text-fg-2 text-[12px] md:text-[14px] leading-snug">{s.text}</span>
            </li>
          ))}
        </ol>
        <div className="grid gap-5 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)] items-start">
          <ol className="order-2 lg:order-1 grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:gap-3" aria-label="Tour chapters">
            {TOUR.map((c, i) => (
              <li key={c.title}>
                <button type="button" onClick={() => jump(i)} aria-current={active === i ? "step" : undefined}
                  className={cx("w-full h-full text-left rounded-2xl border p-3.5 lg:p-4 flex flex-col lg:flex-row gap-2 lg:gap-3.5 transition",
                    active === i ? "bg-card border-line-2 shadow-soft" : "border-transparent hover:bg-card/60")}>
                  <span className={cx("grid place-items-center shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-xl transition", active === i ? "bg-ink text-on-ink" : "bg-peach text-on-peach")}>
                    <Icon name={c.icon} className="text-[20px]" />
                  </span>
                  <span className="flex flex-col gap-1 min-w-0">
                    <span className="text-[14px] lg:text-[16px] font-semibold leading-snug">{c.title}</span>
                    <span className="hidden lg:block text-fg-2 text-[14px]">{c.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <figure id="demo" className="order-1 lg:order-2 rounded-2xl border border-line-2 bg-card shadow-lift overflow-hidden">
            <div aria-hidden="true" className="h-8 md:h-9 px-3 flex items-center gap-1.5 border-b border-line bg-header">
              <span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-line-2" /><span className="w-2.5 h-2.5 rounded-full bg-line-2" />
              <span className="ml-3 flex-1 max-w-[260px] h-5 rounded-md bg-sunken text-[11px] text-fg-3 grid place-items-center">NextCup</span>
            </div>
            <video ref={video} poster={IMG("demo-poster")} muted playsInline loop preload="metadata"
              controls={reduced} onTimeUpdate={onTime} width={1280} height={800} className="block w-full h-auto bg-card"
              aria-label="Screen recording of NextCup: a contact's history, AI follow-up ideas, the calendar, and turning rough notes into a debrief.">
              <source src="/landing/demo.webm" type="video/webm" />
              <source src="/landing/demo.mp4" type="video/mp4" />
            </video>
            <figcaption className="lg:hidden px-4 py-3 text-[14px] text-fg-2 border-t border-line">{TOUR[active].text}</figcaption>
          </figure>
        </div>
        <p className="mt-4 text-center text-[12px] text-fg-3">Demo with made-up contacts.</p>
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
          <p className="label-caps text-brand">The coffee chat tracker for students &amp; early-career professionals</p>
          {/* Fixed line breaks keep "connections warm" together so the steam never overlaps the line above. */}
          <h1 className="font-serif font-medium text-[clamp(30px,9.2vw,40px)] leading-[1.06] md:text-[58px] lg:text-[50px] xl:text-[60px] tracking-[-0.02em] whitespace-nowrap">
            Keep your<br />connections <WarmWord /><br />with <BrandWord />
          </h1>
          <p className="text-fg-2 text-[16px] md:text-[18px] max-w-[48ch]">
            NextCup remembers what you talked about, reminds you when to reach out, and suggests what to say, so the people you meet stay in your corner for years, not days.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mt-1">
            <Button variant="primary" size="lg" iconRight="arrow_forward" onClick={onStart} className="rounded-full px-7">
              {signedIn ? "Open your workspace" : "Start for free"}
            </Button>
            <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById("demo")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); }}
              className="text-[15px] font-semibold text-fg-2 hover:text-fg rounded-md">See how it works ↓</a>
          </div>
          <ul className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[13px] font-medium text-fg-3 mt-1">
            {[["lock", "Private by default"], ["devices", "Laptop and phone"], ["auto_awesome", "AI drafts in your voice"]].map(([ic, t]) => (
              <li key={t} className="flex items-center gap-1.5"><Icon name={ic} className="text-[16px] text-brand-2" />{t}</li>
            ))}
          </ul>
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
          {/* Desktop/tablet: the app card floats over the scene */}
          <div className={cx("hidden md:block absolute right-[-8px] lg:right-[-20px] bottom-[52px] w-[min(330px,58%)] transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
            shown === 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none")}>
            <ContactCard />
          </div>
          <Steps act={shown} onPick={pick} className="mt-4" />
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
  return (
    <div className="relative w-full aspect-[3/2.1]" role="img"
      aria-label="Two young professionals run into each other at a networking event. Both wonder when they last talked and what they discussed. She checks NextCup on her phone and sees their whole history.">
      <div aria-hidden="true" className="absolute inset-x-[4%] top-[8%] bottom-0 rounded-t-[999px] rounded-b-[32px] bg-[color-mix(in_oklab,var(--peach)_55%,var(--card))] border border-line" />
      <img src={IMG("hero-1")} alt="" draggable={false} width={1400} height={933} fetchPriority="high"
        className={cx("absolute inset-x-0 bottom-0 w-full transition-opacity duration-700", act === 0 ? "opacity-100" : "opacity-0")} />
      <img src={IMG("hero-2")} alt="" draggable={false} width={1400} height={933}
        className={cx("absolute inset-x-0 bottom-0 w-full transition-opacity duration-700", act === 0 ? "opacity-0" : "opacity-100")} />
      <Thought show={act === 0} className="left-[1%] top-[17%] md:top-[24%] w-[47%] md:w-[44%]" tail="left-[48%]" delay={250}>What did we chat about again?</Thought>
      <Thought show={act === 0} className="right-[0%] top-[6%] md:top-[14%] w-[45%] md:w-[42%]" tail="left-[38%]" delay={900}>When did we last talk…?</Thought>
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

function Steps({ act, onPick, className }: { act: number; onPick: (i: number) => void; className?: string }) {
  return (
    <ol className={cx("grid grid-cols-3 gap-2", className)} aria-label="The story">
      {ACTS.map((a, i) => (
        <li key={a.label}>
          <button type="button" onClick={() => onPick(i)} aria-current={act === i ? "step" : undefined}
            className="w-full text-left flex flex-col gap-1.5 rounded-md">
            <span className="h-1 rounded-full bg-line overflow-hidden">
              <span className={cx("block h-full rounded-full bg-brand-2 transition-[width] duration-500", act >= i ? "w-full" : "w-0")} />
            </span>
            <span className={cx("text-[12px] md:text-[13px] font-semibold leading-tight", act === i ? "text-fg" : "text-fg-3")}>{a.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Mock contact card for the hero. The person is fictional and labelled as an example. */
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
