import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Button, Icon } from "../components/ui";
import { LogoMark, Wordmark } from "../components/Logo";

const FEATURES = [
  { icon: "description", title: "AI Prep Briefs", text: "Questions, icebreakers and an agenda drawn from your notes and their background, ready before every chat." },
  { icon: "graphic_eq", title: "Two-Minute Debriefs", text: "Dump rough notes right after the chat. NextCup turns them into takeaways and a clear next step." },
  { icon: "account_tree", title: "Follow-ups on Time", text: "A thank-you within 24 hours and a check-in weeks later, planned for you and drafted in your voice." },
];

export function Landing() {
  const { profile } = useStore();
  const { go } = useNav();
  const enter = () => go(profile ? "dashboard" : "signup");
  return (
    <div className="min-h-full flex flex-col bg-card">
      <header className="gutter border-b border-line bg-card/90 backdrop-blur sticky z-40" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto max-w-[1180px] h-[72px] flex items-center justify-between">
          <Wordmark />
          <Button variant="secondary" size="sm" onClick={enter} className="rounded-full">{profile ? "Open app" : "Enter app"}</Button>
        </div>
      </header>

      <section className="gutter dot-grid relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(40% 50% at 35% 55%, color-mix(in oklab, var(--blue-soft) 60%, transparent), transparent 70%), radial-gradient(40% 50% at 65% 55%, color-mix(in oklab, var(--peach) 55%, transparent), transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1180px] py-14 md:py-20 flex flex-col items-center text-center gap-6">
          <h1 className="font-serif font-medium text-[40px] leading-[1.08] md:text-[64px] tracking-[-0.02em] max-w-[16ch] md:max-w-[20ch]">
            The Future of Meaningful Connections Starts Over <em className="text-brand">NextCup.</em>
          </h1>
          <p className="text-fg-2 text-[17px] md:text-[19px] max-w-[52ch]">
            A coffee chat tracker for students and early-career professionals. Prepare smarter questions, capture what you learned, and never miss the follow-up.
          </p>
          <div className="my-2 md:my-4"><LogoMark size={190} animated /></div>
          <Button variant="primary" size="lg" icon="rocket_launch" onClick={enter} className="rounded-full px-7">
            {profile ? "Open your workspace" : "Launch workspace"}
          </Button>
        </div>
      </section>

      <section className="gutter border-t border-line bg-card-2">
        <div className="mx-auto max-w-[1180px] py-14 grid gap-10 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center gap-2.5">
              <Icon name={f.icon} className="text-brand text-[28px]" />
              <h2 className="text-[19px] font-semibold">{f.title}</h2>
              <p className="text-fg-2 text-[15px] max-w-[34ch]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="gutter border-t border-line mt-auto">
        <p className="mx-auto max-w-[1180px] py-8 text-center text-[13px] text-fg-3">NextCup © {new Date().getFullYear()} · Purpose-driven networking for university students</p>
      </footer>
    </div>
  );
}
