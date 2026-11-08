import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { Button, Icon, Thinking, cx } from "./ui";
import { LogoMark } from "./Logo";

const Bot = () => <span className="grid place-items-center w-8 h-8 rounded-full bg-[#fffaf6] border border-line shrink-0"><LogoMark size={22} /></span>;
import { aiAvailable, aiErrorText, assistantRules, chatTurn } from "../lib/ai";
import { relativeDay, formatTime } from "../lib/date";
import { nextChatFor } from "../lib/derive";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const QUICK = [
  { icon: "lightbulb", label: "3 questions to ask", prompt: "Give me 3 specific, thoughtful questions to ask in this chat, each with one line on why it’s a good question." },
  { icon: "handshake", label: "Common ground & icebreakers", prompt: "What common ground can I use, and give me 2 natural icebreakers based on it." },
  { icon: "timer", label: "Chat agenda outline", prompt: "Outline an agenda for the chat with rough minutes for each part." },
  { icon: "record_voice_over", label: "Tailor my intro", prompt: "Rewrite my 30-second intro so it fits this particular person and my goals with them." },
];

export function PrepAssistant({ target, onClose }: { target: { contactId: string; eventId?: string } | null; onClose: () => void }) {
  const store = useStore();
  const open = !!target;
  const c = target ? store.contactById(target.contactId) : undefined;
  const ev = target?.eventId ? store.events.find((e) => e.id === target.eventId) : c ? nextChatFor(c.id, store.events) : undefined;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setMsgs([]); setInput(""); setStreaming("");
    aiAvailable().then(setAiOk);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => { window.removeEventListener("keydown", onKey); ctl.current?.abort(); };
  }, [open, target?.contactId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, streaming]);

  if (!open || !c) return null;
  const notes = store.notes.filter((n) => n.contactId === c.id);

  async function send(text: string) {
    if (!text.trim() || busy || !c) return;
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content: text.trim() }];
    setMsgs((m) => [...m, { role: "user", content: text.trim() }]);
    setInput("");
    setBusy(true); setStreaming("");
    ctl.current = new AbortController();
    const turns = [{ role: "user" as const, content: assistantRules(c, store.profile, notes, ev) }, ...history.slice(-10).map(({ role, content }) => ({ role, content }))];
    try {
      const reply = await chatTurn(turns, setStreaming, ctl.current.signal);
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      const keep = e?.text as string | undefined;
      const err = aiErrorText(e);
      setMsgs((m) => [...m, ...(keep ? [{ role: "assistant" as const, content: keep }] : []), ...(err ? [{ role: "assistant" as const, content: err, error: true }] : [])]);
    } finally { setBusy(false); setStreaming(""); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="prep-title">
      <div className="absolute inset-0 bg-[rgb(20_12_6/0.35)]" onClick={onClose} />
      <aside className="relative w-full sm:w-[440px] h-full bg-card border-l border-line shadow-lift flex flex-col rise"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        <header className="px-5 py-4 border-b border-line flex items-center gap-3 ai-glow">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-ink text-on-ink"><Icon name="auto_awesome" /></span>
          <div className="flex-1 min-w-0">
            <h2 id="prep-title" className="font-semibold leading-tight">AI Prep Assistant</h2>
            <p className="text-[13px] text-fg-2 truncate">Briefing: {c.name}{c.company ? ` (${c.company})` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="grid place-items-center w-9 h-9 rounded-full hover:bg-sunken text-fg-3"><Icon name="close" /></button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-thin px-5 py-5 flex flex-col gap-4">
          <div className="flex gap-3">
            <Bot />
            <div className="rounded-2xl rounded-tl-sm bg-card-2 border border-line px-4 py-3 text-[14px] leading-relaxed">
              Ready to prep for your chat with <b>{c.name}</b>{ev ? <> — {relativeDay(ev.start).toLowerCase() === "today" || relativeDay(ev.start).toLowerCase() === "tomorrow" ? relativeDay(ev.start).toLowerCase() : `on ${relativeDay(ev.start)}`} at {formatTime(ev.start)}</> : null}.
              I’ll work from your profile, your notes on them{notes.length ? ` (${notes.length})` : ""} and your goals. I can’t browse the web, so I’ll flag what’s worth looking up.
            </div>
          </div>
          {msgs.length === 0 && (
            <div className="grid gap-2">
              {QUICK.map((q) => (
                <button key={q.label} type="button" disabled={!aiOk || busy} onClick={() => send(q.prompt)}
                  className="flex items-center gap-3 text-left rounded-xl border border-line bg-card hover:bg-card-2 px-3.5 py-3 text-sm font-semibold disabled:opacity-50">
                  <Icon name={q.icon} className="text-brand text-[20px]" />{q.label}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "gap-3")}>
              {m.role === "assistant" && <Bot />}
              <div className={cx("max-w-[85%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap",
                m.role === "user" ? "rounded-2xl rounded-tr-sm bg-ink text-on-ink" : m.error ? "rounded-2xl rounded-tl-sm bg-danger-soft text-danger" : "rounded-2xl rounded-tl-sm bg-card-2 border border-line")}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <Bot />
              <div className="rounded-2xl rounded-tl-sm bg-card-2 border border-line px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap max-w-[85%]">
                {streaming || <Thinking />}
              </div>
            </div>
          )}
          {aiOk === false && (
            <p className="rounded-xl bg-sunken p-3 text-[13px] text-fg-2">AI isn’t connected in this view. Open NextCup inside Claude, or connect an AI endpoint (see the README).</p>
          )}
          <div ref={endRef} />
        </div>

        <form className="border-t border-line p-3 flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <label htmlFor="prep-input" className="sr-only">Ask the assistant</label>
          <textarea id="prep-input" ref={inputRef} rows={1} value={input} disabled={!aiOk}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={aiOk ? "Ask about this chat… (Enter to send)" : "AI not connected"}
            className="flex-1 resize-none rounded-xl bg-sunken px-3.5 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-brand-2 max-h-32" />
          {busy
            ? <Button variant="secondary" icon="stop" onClick={() => ctl.current?.abort()} aria-label="Stop">Stop</Button>
            : <Button variant="primary" icon="send" type="submit" disabled={!aiOk || !input.trim()} aria-label="Send" />}
        </form>
        <p className="px-4 pb-2 text-[11px] text-fg-3 flex items-center gap-1"><Icon name="lock" className="text-[14px]" />Your notes are only sent to the assistant when you ask.</p>
      </aside>
    </div>
  );
}
