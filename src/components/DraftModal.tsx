import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { Button, Icon, Label, Modal, TextArea, Thinking, copyText, useToast } from "./ui";
import { aiAvailable, aiErrorText, draftThankYou, templateThankYou } from "../lib/ai";
import { fromNow, todayISO } from "../lib/date";
import type { ChatEvent } from "../lib/types";

/** Write and send-off a thank-you or follow-up message for a planned task. */
export function DraftModal({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const ev = eventId ? store.events.find((e) => e.id === eventId) : undefined;
  const c = ev ? store.contactById(ev.contactId) : undefined;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOk, setAiOk] = useState(false);
  const [err, setErr] = useState("");
  const ctl = useRef<AbortController | null>(null);

  const notes = c ? store.notes.filter((n) => n.contactId === c.id) : [];
  const lastDebrief = notes.filter((n) => n.kind === "debrief").sort((a, b) => b.date.localeCompare(a.date))[0];

  useEffect(() => {
    if (!ev || !c) return;
    setText(ev.draft ?? (ev.kind === "thankyou" ? templateThankYou(c, store.profile, lastDebrief) : ""));
    setErr("");
    aiAvailable().then(setAiOk);
    return () => ctl.current?.abort();
  }, [eventId]);

  if (!ev || !c) return null;

  async function write() {
    if (!c || !ev) return;
    ctl.current?.abort();
    ctl.current = new AbortController();
    setBusy(true); setErr("");
    const before = text;
    try {
      const out = await draftThankYou(c, store.profile, notes, ev.kind === "followup" ? "followup" : "thankyou", setText, ctl.current.signal);
      setText(out);
    } catch (e: any) {
      if (e?.text) setText(e.text); else setText(before);
      const t = aiErrorText(e); if (t) setErr(t);
    } finally { setBusy(false); }
  }

  async function saveDraft() {
    if (!ev) return;
    await store.upsertEvent({ ...ev, draft: text });
    toast("Draft saved");
  }
  async function markSent() {
    if (!ev || !c) return;
    const done: ChatEvent = { ...ev, draft: text, status: "done" };
    await store.upsertEvent(done);
    const today = todayISO();
    if (!c.lastContact || c.lastContact < today) await store.upsertContact({ ...c, lastContact: today, updatedAt: new Date().toISOString() });
    toast(ev.kind === "thankyou" ? "Thank-you marked as sent" : "Follow-up marked as done");
    onClose();
  }
  async function copy() {
    const ok = await copyText(text);
    toast(ok ? "Copied — paste it into your email or LinkedIn" : "Select the text and copy it manually", ok ? "ok" : "error");
  }

  return (
    <Modal open onClose={onClose} wide labelledBy="draft-title"
      title={ev.kind === "thankyou" ? `Thank-you note to ${c.name.split(" ")[0]}` : `Follow-up with ${c.name.split(" ")[0]}`}
      footer={<>
        <Button variant="ghost" onClick={saveDraft}>Save draft</Button>
        <Button variant="secondary" icon="content_copy" onClick={copy} disabled={!text.trim()}>Copy</Button>
        <Button variant="primary" icon="send" onClick={markSent}>Mark as sent</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-2">
          <span className="inline-flex items-center gap-1.5"><Icon name="schedule" className="text-[16px]" />Due {fromNow(ev.start)}</span>
          {c.email && <span className="inline-flex items-center gap-1.5 select-all"><Icon name="mail" className="text-[16px]" />{c.email}</span>}
          {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand font-semibold"><Icon name="open_in_new" className="text-[16px]" />LinkedIn</a>}
        </div>
        {lastDebrief && (
          <div className="rounded-xl bg-card-2 border border-line p-3 text-[13px]">
            <p className="label-caps text-fg-3 mb-1">From your debrief</p>
            <p className="font-semibold">{lastDebrief.headline}</p>
            {lastDebrief.nextStep && <p className="text-fg-2 mt-0.5">Next step: {lastDebrief.nextStep}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="draft-text" hint={busy ? <Thinking label="Writing" /> : undefined}>Message</Label>
          <TextArea id="draft-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} readOnly={busy}
            placeholder="Write a short note that references something specific from your chat." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {aiOk && (busy
            ? <Button variant="secondary" size="sm" icon="stop" onClick={() => ctl.current?.abort()}>Stop</Button>
            : <Button variant="ai" size="sm" icon="auto_awesome" onClick={write}>{text.trim() ? "Rewrite with AI" : "Write with AI"}</Button>)}
          {err && <span className="text-[13px] text-danger">{err}</span>}
          {!aiOk && <span className="text-[12px] text-fg-3">AI drafting isn’t connected here, so this starts from a template.</span>}
        </div>
      </div>
    </Modal>
  );
}
