import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useNav, type LogTarget } from "../lib/nav";
import { Button, Icon, Input, Label, Modal, Select, TextArea, Thinking, useToast } from "./ui";
import { aiAvailable, aiErrorText, tidyNotes } from "../lib/ai";
import { todayISO, uid, formatShort } from "../lib/date";
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
  const [titleChoice, setTitleChoice] = useState("new");
  const [newTitle, setNewTitle] = useState("");
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
    setRaw(""); setNewTitle(ev?.title ?? ev?.topic ?? "");
    setTitleChoice(ev?.title || ev?.topic ? ev.id : "new"); setAiErr("");
    aiAvailable().then(setAiOk);
    return () => ctl.current?.abort();
  }, [open, target?.contactId, target?.eventId]);

  const contacts = useMemo(() => store.contacts.slice().sort((a, b) => a.name.localeCompare(b.name)), [store.contacts]);
  const contact = store.contacts.find((c) => c.id === contactId);
  const scheduledTitles = useMemo(() => store.events
    .filter((e) => e.contactId === contactId && e.kind === "coffee" && e.status === "planned" && (e.title || e.topic))
    .sort((a, b) => a.start.localeCompare(b.start)), [store.events, contactId]);

  async function tidy() {
    if (!raw.trim()) return;
    ctl.current?.abort();
    ctl.current = new AbortController();
    setTidying(true); setAiErr("");
    try {
      const r = await tidyNotes(raw, contact, ctl.current.signal);
      if (r.headline) { setTitleChoice("new"); setNewTitle(r.headline); }
      if (r.body) setRaw(r.body);
    } catch (e) {
      const t = aiErrorText(e);
      if (t) setAiErr(t);
    } finally { setTidying(false); }
  }

  async function save() {
    if (!contactId && !newName.trim()) { toast("Choose who you met, or add their name.", "error"); return; }
    const scheduledEvent = scheduledTitles.find((e) => e.id === titleChoice);
    const title = titleChoice === "new" ? newTitle.trim() : (scheduledEvent?.title ?? scheduledEvent?.topic ?? "").trim();
    if (!title) { toast("Add or choose a title for this chat.", "error"); document.getElementById(titleChoice === "new" ? "log-new-title" : "log-title-choice")?.focus(); return; }
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

      let event: ChatEvent | undefined = scheduledEvent ?? (titleChoice === "new" ? ev : undefined);
      if (event) event = { ...event, title, status: "done" };
      else event = { id: uid("e"), contactId: updated.id, kind: "coffee", start: `${date}T12:00`, durationMin: store.profile?.durationMin ?? 30, title, status: "done", createdAt: now };
      await store.upsertEvent(event);

      const note: Note = {
        id: uid("n"), contactId: updated.id, eventId: event.id, date, kind: "debrief", pinned: true,
        headline: title.trim(),
        body: raw.trim(),
        createdAt: now,
      };
      await store.upsertNote(note);

      toast("Chat logged");
      onClose();
      go("contact", updated.id);
    } catch {
      /* store shows the error */
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={ev ? "Log a coffee chat" : "Log a coffee chat"} labelledBy="log-title"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save debrief"}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <p className="text-fg-2 text-sm">Capture it while it’s fresh.</p>
        <div className="grid sm:grid-cols-[1fr_180px] gap-3">
          <div>
            <Label htmlFor="log-contact">Who did you meet?</Label>
            {ev ? (
              <div className="rounded-lg bg-sunken px-3 py-2.5 font-semibold">{contact?.name} <span className="text-fg-3 font-normal">· {formatShort(ev.start)}</span></div>
            ) : (
              <Select id="log-contact" value={contactId} onChange={(e) => { setContactId(e.target.value); setTitleChoice("new"); setNewTitle(""); }}>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-title-choice" hint="Required">Title</Label>
          <Select id="log-title-choice" value={titleChoice} onChange={(e) => {
            const choice = e.target.value;
            setTitleChoice(choice);
            const selected = scheduledTitles.find((item) => item.id === choice);
            if (selected) setDate(selected.start.slice(0, 10));
          }}>
            <option value="new">Type a new title…</option>
            {scheduledTitles.map((item) => <option key={item.id} value={item.id}>{item.title || item.topic} · {formatShort(item.start)}</option>)}
          </Select>
          {titleChoice === "new" && <Input id="log-new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Career paths into fintech product" required />}
        </div>
        {!contactId && !ev && (
          <div className="grid sm:grid-cols-2 gap-3 rounded-xl bg-card-2 border border-line p-3">
            <div><Label htmlFor="log-new-name">Name</Label><Input id="log-new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Priya Shah" /></div>
            <div><Label htmlFor="log-new-co">Company</Label><Input id="log-new-co" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Shopify" /></div>
          </div>
        )}

        <div className="rounded-xl ai-glow border border-line p-3.5 flex flex-col gap-2.5">
          <Label htmlFor="log-raw">Rough notes</Label>
          <TextArea id="log-raw" value={raw} onChange={(e) => setRaw(e.target.value)} rows={4}
            placeholder="What they said about the role, advice, names they mentioned, what you promised to send…" />
          <div className="flex flex-wrap items-center gap-3">
            {aiOk && <Button variant="ai" size="sm" icon="auto_awesome" onClick={tidy} disabled={tidying || !raw.trim()}>Tidy into a debrief</Button>}
            {tidying && <Thinking label="Organizing your notes" />}
            {aiErr && <span className="text-[13px] text-danger">{aiErr}</span>}
          </div>
        </div>

        {!aiOk && <p className="text-[12px] text-fg-3 flex gap-1.5"><Icon name="info" className="text-[16px]" />AI note tidying isn’t connected in this view. Everything else works.</p>}
      </div>
    </Modal>
  );
}
