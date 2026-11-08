import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useNav, type LogTarget } from "../lib/nav";
import { Button, Icon, Input, Label, Modal, Select, TextArea, Thinking, useToast } from "./ui";
import { aiAvailable, aiErrorText, tidyNotes } from "../lib/ai";
import { addDays, todayISO, uid, formatShort } from "../lib/date";
import type { ChatEvent, Contact, Note } from "../lib/types";

export type { LogTarget };

/** "Log a chat" — the two-minute debrief right after a coffee chat. */
export function LogChatModal({ target, onClose }: { target: LogTarget | null; onClose: () => void }) {
  const store = useStore();
  const { go } = useNav();
  const toast = useToast();
  const open = target !== null;
  const ev = target?.eventId ? store.events.find((e) => e.id === target.eventId) : undefined;

  const [contactId, setContactId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [date, setDate] = useState(todayISO());
  const [raw, setRaw] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [plan, setPlan] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tidying, setTidying] = useState(false);
  const [aiOk, setAiOk] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const cid = target?.contactId ?? ev?.contactId ?? "";
    setContactId(cid);
    setNewName(""); setNewCompany("");
    setDate(ev ? ev.start.slice(0, 10) : todayISO());
    setRaw(""); setHeadline(ev?.topic ?? ""); setBody(""); setNextStep(""); setPlan(true); setAiErr("");
    aiAvailable().then(setAiOk);
    return () => ctl.current?.abort();
  }, [open, target?.contactId, target?.eventId]);

  const contacts = useMemo(() => store.contacts.slice().sort((a, b) => a.name.localeCompare(b.name)), [store.contacts]);
  const contact = store.contacts.find((c) => c.id === contactId);
  const weeks = store.profile?.followUpWeeks ?? 3;

  async function tidy() {
    if (!raw.trim()) return;
    ctl.current?.abort();
    ctl.current = new AbortController();
    setTidying(true); setAiErr("");
    try {
      const r = await tidyNotes(raw, contact, ctl.current.signal);
      if (r.headline) setHeadline(r.headline);
      if (r.body) setBody(r.body);
      if (r.nextStep) setNextStep(r.nextStep);
    } catch (e) {
      const t = aiErrorText(e);
      if (t) setAiErr(t);
    } finally { setTidying(false); }
  }

  async function save() {
    if (!contactId && !newName.trim()) { toast("Choose who you met, or add their name.", "error"); return; }
    if (!headline.trim() && !body.trim() && !raw.trim()) { toast("Add at least a line about the chat.", "error"); return; }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      let c: Contact | undefined = contact;
      if (!c) {
        c = {
          id: uid("c"), name: newName.trim(), title: "", company: newCompany.trim(), roleTypes: [], metVia: "event", metAt: "",
          goals: [], notes: "", createdAt: now, updatedAt: now,
        };
      }
      const updated: Contact = { ...c, lastContact: !c.lastContact || date > c.lastContact ? date : c.lastContact, updatedAt: now };
      await store.upsertContact(updated);

      let event: ChatEvent | undefined = ev;
      if (event) event = { ...event, status: "done" };
      else event = { id: uid("e"), contactId: updated.id, kind: "coffee", start: `${date}T12:00`, durationMin: store.profile?.durationMin ?? 30, status: "done", createdAt: now };
      await store.upsertEvent(event);

      const note: Note = {
        id: uid("n"), contactId: updated.id, eventId: event.id, date, kind: "debrief", pinned: true,
        headline: headline.trim() || "Coffee chat debrief",
        body: body.trim() || raw.trim(),
        nextStep: nextStep.trim() || undefined,
        createdAt: now,
      };
      await store.upsertNote(note);

      let planned = 0;
      if (plan) {
        const base = new Date(`${date}T09:00`);
        const ty = addDays(base, 1);
        const fu = addDays(base, weeks * 7);
        const exists = (kind: ChatEvent["kind"]) => store.events.some((e) => e.contactId === updated.id && e.kind === kind && e.status === "planned" && e.start >= date);
        if (!exists("thankyou")) {
          await store.upsertEvent({ id: uid("e"), contactId: updated.id, kind: "thankyou", start: `${todayISO(ty)}T09:00`, durationMin: 15, status: "planned", topic: note.headline, createdAt: now });
          planned++;
        }
        if (!exists("followup")) {
          await store.upsertEvent({ id: uid("e"), contactId: updated.id, kind: "followup", start: `${todayISO(fu)}T10:00`, durationMin: 15, status: "planned", topic: nextStep.trim() || "Share an update on their advice", createdAt: now });
          planned++;
        }
      }
      toast(planned ? `Chat logged · ${planned} follow-up${planned > 1 ? "s" : ""} planned` : "Chat logged");
      onClose();
      go("contact", updated.id);
    } catch {
      /* store shows the error */
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={ev ? "Post-meeting notes" : "Log a coffee chat"} labelledBy="log-title"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save debrief"}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <p className="text-fg-2 text-sm">Capture it while it’s fresh. Two minutes now saves the thank-you note later.</p>
        <div className="grid sm:grid-cols-[1fr_180px] gap-3">
          <div>
            <Label htmlFor="log-contact">Who did you meet?</Label>
            {ev ? (
              <div className="rounded-lg bg-sunken px-3 py-2.5 font-semibold">{contact?.name} <span className="text-fg-3 font-normal">· {formatShort(ev.start)}</span></div>
            ) : (
              <Select id="log-contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">New person…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
              </Select>
            )}
          </div>
          <div>
            <Label htmlFor="log-date">Date</Label>
            <Input id="log-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {!contactId && !ev && (
          <div className="grid sm:grid-cols-2 gap-3 rounded-xl bg-card-2 border border-line p-3">
            <div><Label htmlFor="log-new-name">Name</Label><Input id="log-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Priya Shah" /></div>
            <div><Label htmlFor="log-new-co">Company</Label><Input id="log-new-co" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Shopify" /></div>
          </div>
        )}

        <div className="rounded-xl ai-glow border border-line p-3.5 flex flex-col gap-2.5">
          <Label htmlFor="log-raw" hint="Dictate or type — messy is fine">Rough notes</Label>
          <TextArea id="log-raw" value={raw} onChange={(e) => setRaw(e.target.value)} rows={4}
            placeholder="what they said about the role, advice, names they mentioned, what you promised to send…" />
          <div className="flex flex-wrap items-center gap-3">
            {aiOk && <Button variant="ai" size="sm" icon="auto_awesome" onClick={tidy} disabled={tidying || !raw.trim()}>Tidy into a debrief</Button>}
            {tidying && <Thinking label="Organizing your notes" />}
            {aiErr && <span className="text-[13px] text-danger">{aiErr}</span>}
          </div>
        </div>

        <div><Label htmlFor="log-headline">Headline</Label>
          <Input id="log-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Career paths into fintech product" /></div>
        <div><Label htmlFor="log-body">Key takeaways</Label>
          <TextArea id="log-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={"• Advice they gave\n• Something to remember about them"} /></div>
        <div><Label htmlFor="log-next">Your next step</Label>
          <Input id="log-next" icon="flag" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Send my GitHub link and the case I mentioned" /></div>

        <label htmlFor="log-plan" className="flex gap-3 items-start rounded-xl border border-line p-3.5 cursor-pointer">
          <input id="log-plan" type="checkbox" checked={plan} onChange={(e) => setPlan(e.target.checked)} className="mt-1 w-4 h-4 accent-[var(--brand-2)]" />
          <span>
            <span className="block text-sm font-semibold">Plan my follow-ups</span>
            <span className="block text-[13px] text-fg-3">Thank-you note due {formatShort(todayISO(addDays(new Date(`${date}T09:00`), 1)))} and a check-in in {weeks} weeks. You’ll see both on your dashboard.</span>
          </span>
        </label>
        {!aiOk && <p className="text-[12px] text-fg-3 flex gap-1.5"><Icon name="info" className="text-[16px]" />AI note tidying isn’t connected in this view. Everything else works.</p>}
      </div>
    </Modal>
  );
}
