import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { intent, useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Empty, Icon, Input, Label, Modal, Select, TextArea, Thinking, copyText, cx, useToast } from "../components/ui";
import { GoalChips, MetLine, RoleChips } from "../components/bits";
import { DraftModal } from "../components/DraftModal";
import { aiAvailable, aiErrorText, generateFollowUps, generatePrepBrief } from "../lib/ai";
import { isOverdue, lastContactOf, nextChatFor } from "../lib/derive";
import { formatDate, formatTime, fromNow, relativeDay, timeRange, todayISO, uid } from "../lib/date";
import { eventToIcs, saveFile } from "../lib/files";
import { FORMAT_LABEL, KIND_LABEL, type ChatEvent, type Contact, type Note, type NoteKind } from "../lib/types";

type Tool = "history" | "log" | "ideas";

export function ContactProfile({ id }: { id: string }) {
  const store = useStore();
  const { go, openLog, openPrep } = useNav();
  const c = store.contactById(id);
  const [tab, setTab] = useState<"overview" | "prep">(intent.tab ?? "overview");
  const [tool, setTool] = useState<Tool>("history");
  const [draftId, setDraftId] = useState<string | null>(null);
  useEffect(() => { intent.tab = undefined; }, []);

  if (!c) {
    return <Card><Empty icon="person_off" title="Contact not found" action={<Button onClick={() => go("contacts")}>Back to contacts</Button>}>It may have been deleted.</Empty></Card>;
  }
  const events = store.events.filter((e) => e.contactId === c.id);
  const notes = store.notes.filter((n) => n.contactId === c.id);
  const next = nextChatFor(c.id, store.events);
  const last = lastContactOf(c, store.events);

  return (
    <div className="flex flex-col gap-6 rise">
      <button type="button" onClick={() => go("contacts")} className="self-start inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-card border border-line shadow-soft text-sm font-semibold hover:bg-card-2">
        <Icon name="arrow_back" className="text-[18px]" />Back to Contact Directory
      </button>

      <Card className="p-5 md:p-7 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-start">
          <div className="flex gap-4 md:gap-5 flex-1 min-w-0">
            <Avatar name={c.name} size={88} />
            <div className="min-w-0 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-[32px] md:text-[42px] leading-none font-semibold tracking-[-0.015em]">{c.name}</h1>
                <button type="button" onClick={() => go("edit", c.id)} className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-[12px] font-bold text-fg-2 hover:bg-card-2"><Icon name="edit" className="text-[14px]" />Edit Details</button>
              </div>
              {(c.title || c.company) && <p className="text-[18px] md:text-[20px] font-semibold text-fg-2">{c.title}{c.title && c.company ? " @ " : ""}{c.company}</p>}
              <MetLine c={c} />
              <div className="flex flex-wrap gap-3 text-[13px] text-fg-3">
                {c.email && <span className="inline-flex items-center gap-1 select-all"><Icon name="mail" className="text-[15px]" />{c.email}</span>}
                {c.linkedin && <a className="inline-flex items-center gap-1 text-brand font-semibold" href={c.linkedin} target="_blank" rel="noreferrer"><Icon name="open_in_new" className="text-[15px]" />LinkedIn</a>}
              </div>
            </div>
          </div>
          {next ? (
            <div className="rounded-xl ai-glow border border-line p-4 lg:min-w-[300px] shadow-soft">
              <p className="label-caps text-fg-3">Next scheduled chat</p>
              <p className="text-[19px] font-bold mt-1 flex items-center gap-2 tnum"><Icon name="calendar_month" className="text-[20px]" />{relativeDay(next.start)} · {formatTime(next.start)}</p>
              <p className="text-[13px] text-fg-2">{next.format ? `Via ${FORMAT_LABEL[next.format]}` : "Coffee chat"} ({next.durationMin}m){next.location ? ` · ${next.location}` : ""}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button size="sm" variant="primary" icon="auto_awesome" onClick={() => openPrep(c.id, next.id)}>Prep with AI</Button>
                {next.link && <a href={next.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-line-2 text-[13px] font-semibold"><Icon name="videocam" className="text-[16px]" />Join</a>}
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" icon="event_available" onClick={() => go("schedule", c.id)}>Schedule Event</Button>
              <Button variant="secondary" icon="edit_note" onClick={() => openLog({ contactId: c.id })}>Log a chat</Button>
            </div>
          )}
        </div>
        <div className="pt-4 border-t border-line flex flex-wrap items-center gap-x-6 gap-y-3">
          {c.roleTypes.length > 0 && <div className="flex flex-wrap gap-1.5"><RoleChips roles={c.roleTypes} school={c.school} /></div>}
          {c.goals.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="label-caps text-fg-3 mr-1">Outreach goals:</span><GoalChips goals={c.goals} /></div>}
          <span className="text-[13px] text-fg-3 lg:ml-auto tnum">Last contact: {last ? formatDate(last) : "not yet"}</span>
        </div>
      </Card>

      <div role="tablist" aria-label="Contact sections" className="self-start inline-flex rounded-2xl bg-card-2 border border-line p-1.5 gap-1">
        {([["overview", "History & AI Suite", "auto_awesome"], ["prep", "Meeting Prep & Research", "menu_book"]] as const).map(([k, l, ic]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx("inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition", tab === k ? "bg-card shadow-soft text-fg" : "text-fg-2 hover:text-fg")}>
            <Icon name={ic} className="text-[18px]" />{l}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid gap-3 md:gap-4 md:grid-cols-3" role="group" aria-label="Tools">
            <ToolCard active={tool === "history"} onClick={() => setTool("history")} icon="history_edu" tag={`${events.length} event${events.length === 1 ? "" : "s"}`} title="Meeting History" text="All chats, follow-up touchpoints, and thank you messages." />
            <ToolCard active={tool === "log"} onClick={() => setTool("log")} icon="edit_note" tag="Notes & Debriefs" title="Log History" text="Logged coffee chats, follow-up messages, and quick notes." />
            <ToolCard active={tool === "ideas"} onClick={() => setTool("ideas")} icon="lightbulb" tag={`${store.profile?.followUpWeeks ?? 3}-wk cadence`} title="Follow-up Ideas" text="AI re-engagement hooks tailored to what you discussed." />
          </div>
          {tool === "history" && <HistoryPanel c={c} events={events} notes={notes} onDraft={setDraftId} />}
          {tool === "log" && <LogPanel c={c} notes={notes} />}
          {tool === "ideas" && <IdeasPanel c={c} notes={notes} />}
        </>
      ) : (
        <PrepPanel c={c} notes={notes} next={next} />
      )}
      <DraftModal eventId={draftId} onClose={() => setDraftId(null)} />
    </div>
  );
}

function ToolCard({ active, onClick, icon, tag, title, text }: { active: boolean; onClick: () => void; icon: string; tag: string; title: string; text: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cx("text-left rounded-2xl p-5 border-2 transition flex flex-col gap-2", active ? "bg-card border-ink shadow-lift" : "bg-card-2 border-transparent hover:bg-card")}>
      <span className="flex items-start justify-between gap-2">
        <span className="grid place-items-center w-10 h-10 rounded-lg bg-peach text-on-peach"><Icon name={icon} /></span>
        <Chip tone={active ? "blue" : "neutral"}>{active ? "Active Tool" : tag}</Chip>
      </span>
      <span className="text-[19px] font-bold mt-1">{title}</span>
      <span className="text-[14px] text-fg-2">{text}</span>
    </button>
  );
}

function statusChip(e: ChatEvent) {
  if (e.status === "done") return <Chip tone="blue" icon="check">Completed</Chip>;
  if (isOverdue(e)) return <Chip tone="danger">Overdue</Chip>;
  return <Chip tone="peach">Upcoming / Planned</Chip>;
}

function HistoryPanel({ c, events, notes, onDraft }: { c: Contact; events: ChatEvent[]; notes: Note[]; onDraft: (id: string) => void }) {
  const { openLog, openPrep, go } = useNav();
  const [open, setOpen] = useState<string | null>(null);
  const sorted = events.slice().sort((a, b) => b.start.localeCompare(a.start));
  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h2 className="font-serif text-[26px] md:text-[30px] font-semibold leading-tight">Meeting History</h2>
          <p className="text-fg-2 text-[14px]">All formal and informal interactions with {c.name}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" icon="event_available" onClick={() => go("schedule", c.id)}>Schedule Event</Button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <Empty icon="history" title="No meetings yet">Schedule your first chat, or log one that already happened.</Empty>
      ) : (
        <ol className="relative flex flex-col gap-6 pl-8">
          <span aria-hidden="true" className="absolute left-[11px] top-2 bottom-2 w-px bg-line-2" />
          {sorted.map((e) => {
            const note = notes.find((n) => n.eventId === e.id);
            const isOpen = open === e.id;
            return (
              <li key={e.id} className="relative">
                <span className={cx("absolute -left-8 top-0.5 grid place-items-center w-6 h-6 rounded-full", e.status === "done" ? "bg-brand text-on-ink" : "bg-card border border-line-2 text-fg-3")}>
                  <Icon name={e.status === "done" ? "check" : "schedule"} className="text-[14px]" />
                </span>
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[19px] font-bold tnum">{formatDate(e.start)}</span>{statusChip(e)}
                  </div>
                  <span className="text-[13px] text-fg-2">{e.kind === "coffee" ? `${e.durationMin} min ${e.format ? FORMAT_LABEL[e.format].toLowerCase() : "coffee chat"}` : KIND_LABEL[e.kind]}</span>
                </div>
                <div className="mt-2 rounded-xl bg-card-2 border border-line">
                  <div className="flex flex-wrap items-center gap-3 justify-between p-4">
                    <p className="font-semibold text-[16px]">{note?.headline || e.title || e.topic || (e.kind === "coffee" ? "Coffee chat" : KIND_LABEL[e.kind])}</p>
                    <div className="flex gap-2 flex-wrap">
                      {e.kind === "coffee" && e.status === "planned" && <>
                        <Button size="sm" variant="ghost" icon="auto_awesome" onClick={() => openPrep(c.id, e.id)}>Brief</Button>
                        <Button size="sm" variant="ghost" icon="event" onClick={() => saveFile(`coffee-chat-${c.name.split(" ")[0].toLowerCase()}.ics`, eventToIcs(e, c), "text/calendar")}>.ics</Button>
                        <Button size="sm" variant="secondary" icon="edit_note" onClick={() => openLog({ eventId: e.id })}>Log a chat</Button>
                      </>}
                      {(e.kind === "followup" || e.kind === "thankyou") && e.status === "planned" && <Button size="sm" variant="ghost" icon="auto_awesome" onClick={() => openPrep(c.id, e.id)}>Brief</Button>}
                      {e.kind !== "coffee" && e.status === "planned" && <Button size="sm" variant="secondary" icon="edit" onClick={() => onDraft(e.id)}>Draft message</Button>}
                      {e.kind === "coffee" ? (
                        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-card text-[13px] font-semibold">
                          {isOpen ? "Hide meeting details" : "View meeting details"}<Icon name={isOpen ? "expand_less" : "expand_more"} className="text-[18px]" />
                        </button>
                      ) : e.draft && (
                        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.id)} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-card text-[13px] font-semibold">
                          {isOpen ? "Hide message" : "View message"}<Icon name={isOpen ? "expand_less" : "expand_more"} className="text-[18px]" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    e.kind === "coffee" ? (
                      <dl className="grid gap-3 border-t border-line px-4 pb-4 pt-3 text-[14px] sm:grid-cols-2">
                        <div><dt className="label-caps text-fg-3">Date and time</dt><dd className="mt-1 text-fg-2">{formatDate(e.start)} · {timeRange(e.start, e.durationMin)}</dd></div>
                        <div><dt className="label-caps text-fg-3">Duration</dt><dd className="mt-1 text-fg-2">{e.durationMin} minutes</dd></div>
                        <div><dt className="label-caps text-fg-3">Format</dt><dd className="mt-1 text-fg-2">{e.format ? FORMAT_LABEL[e.format] : "Coffee chat"}</dd></div>
                        {e.location && <div><dt className="label-caps text-fg-3">Location</dt><dd className="mt-1 text-fg-2">{e.location}</dd></div>}
                        {e.link && <div><dt className="label-caps text-fg-3">Meeting link</dt><dd className="mt-1"><a href={e.link} target="_blank" rel="noreferrer" className="text-brand font-semibold break-all">{e.link}</a></dd></div>}
                        {e.topic && <div className="sm:col-span-2"><dt className="label-caps text-fg-3">Topic</dt><dd className="mt-1 text-fg-2">{e.topic}</dd></div>}
                      </dl>
                    ) : (
                      <div className="border-t border-line px-4 pb-4 pt-3 text-[14px] text-fg-2 whitespace-pre-wrap">{e.draft}</div>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

const KIND_NOTE: Record<NoteKind, string> = { debrief: "Meeting Debrief", prep: "Prep Note", intro: "First Impression", note: "Note", followup_response: "Response to follow-up", followup_message: "Follow-up message" };

function LogPanel({ c, notes }: { c: Contact; notes: Note[] }) {
  const store = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Note | null>(null);
  const [del, setDel] = useState<Note | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = notes.slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date));
  const blank = (): Note => ({ id: uid("n"), contactId: c.id, date: todayISO(), headline: "", body: "", kind: "prep", createdAt: new Date().toISOString() });
  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h2 className="font-serif text-[26px] md:text-[30px] font-semibold leading-tight flex items-center gap-2">Log History <Chip tone="neutral">{notes.length} Notes</Chip></h2>
          <p className="text-fg-2 text-[14px]">Logged messages with {c.name.split(" ")[0]}.</p>
        </div>
        <Button variant="primary" icon="add" onClick={() => setEdit(blank())}>New Note</Button>
      </div>
      {sorted.length === 0 ? <Empty icon="edit_note" title="No notes yet">Jot down prep questions before the chat, or your first impression from where you met.</Empty> : (
        <ul className="flex flex-col gap-3">
          {sorted.map((n) => (
            <li key={n.id} className="rounded-xl border border-line bg-card-2 p-4 md:p-5 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {n.pinned && <Chip tone="ink" icon="push_pin">Pinned</Chip>}
                  <Chip tone={n.kind === "debrief" ? "blue" : "sand"}>{KIND_NOTE[n.kind]}</Chip>
                  <span className="text-[13px] text-fg-3 tnum">{formatDate(n.date)}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon="push_pin" aria-label={n.pinned ? "Unpin" : "Pin"} onClick={() => store.upsertNote({ ...n, pinned: !n.pinned })} />
                  <Button size="sm" variant="ghost" icon="edit" aria-label="Edit note" onClick={() => setEdit(n)} />
                  <Button size="sm" variant="ghost" icon="delete" aria-label="Delete note" onClick={() => setDel(n)} />
                </div>
              </div>
              <button type="button" aria-expanded={expanded === n.id} aria-controls={`log-note-${n.id}`}
                onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                className="flex w-full items-center justify-between gap-3 text-left">
                <span className="text-[17px] font-bold">{n.headline}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-fg-3">
                  {expanded === n.id ? "Hide note" : "View note"}
                  <Icon name={expanded === n.id ? "expand_less" : "expand_more"} className="text-[20px]" />
                </span>
              </button>
              {expanded === n.id && <div id={`log-note-${n.id}`} className="border-t border-line pt-3">
                <p className="text-[14px] text-fg-2 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                {n.nextStep && <p className="text-[13px] font-semibold mt-2"><Icon name="flag" className="text-[15px] align-[-3px] mr-1 text-brand" />Next step: {n.nextStep}</p>}
              </div>}
            </li>
          ))}
        </ul>
      )}
      <NoteModal note={edit} onClose={() => setEdit(null)} onSave={async (n) => { await store.upsertNote(n); toast("Note saved"); setEdit(null); }} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this note?" labelledBy="del-note"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" icon="delete" onClick={async () => { if (del) { await store.deleteNote(del.id); toast("Note deleted"); } setDel(null); }}>Delete</Button></>}>
        <p className="text-fg-2">“{del?.headline}” will be removed permanently.</p>
      </Modal>
    </Card>
  );
}

function NoteModal({ note, onClose, onSave }: { note: Note | null; onClose: () => void; onSave: (n: Note) => void }) {
  const [n, setN] = useState<Note | null>(note);
  useEffect(() => setN(note), [note]);
  if (!n) return null;
  return (
    <Modal open onClose={onClose} title={note?.headline ? "Edit note" : "New note"} labelledBy="note-title"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="check" disabled={!n.headline.trim()} onClick={() => onSave({ ...n, headline: n.headline.trim(), nextStep: n.nextStep?.trim() || undefined })}>Save note</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="nm-date">Date</Label><Input id="nm-date" type="date" value={n.date} onChange={(e) => setN({ ...n, date: e.target.value })} /></div>
          <div><Label htmlFor="nm-kind">Type</Label>
            <Select id="nm-kind" value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value as NoteKind })}>
              {(Object.keys(KIND_NOTE) as NoteKind[]).map((k) => <option key={k} value={k}>{KIND_NOTE[k]}</option>)}
            </Select></div>
        </div>
        <div><Label htmlFor="nm-head">Headline</Label><Input id="nm-head" value={n.headline} onChange={(e) => setN({ ...n, headline: e.target.value })} placeholder="Pre-chat questions & hooks" /></div>
        <div><Label htmlFor="nm-body">Details</Label><TextArea id="nm-body" rows={6} value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} /></div>
        <div><Label htmlFor="nm-next" hint="Optional">Next step</Label><Input id="nm-next" value={n.nextStep ?? ""} onChange={(e) => setN({ ...n, nextStep: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function useAi() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { aiAvailable().then(setOk); }, []);
  return ok;
}

function IdeasPanel({ c, notes }: { c: Contact; notes: Note[] }) {
  const store = useStore();
  const toast = useToast();
  const aiOk = useAi();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const ideas = c.aiFollowUps;

  async function gen() {
    ctl.current = new AbortController();
    setBusy(true); setErr("");
    try {
      const r = await generateFollowUps(c, store.profile, notes, ctl.current.signal);
      await store.upsertContact({ ...c, aiFollowUps: r, updatedAt: new Date().toISOString() });
    } catch (e) { setErr(aiErrorText(e)); } finally { setBusy(false); }
  }
  async function remind() {
    if (!ideas) return;
    await store.upsertEvent({ id: uid("e"), contactId: c.id, kind: "followup", start: `${ideas.recommendedDate}T10:00`, durationMin: 15, status: "planned", topic: ideas.ideas[0]?.title, createdAt: new Date().toISOString() });
    toast(`Follow-up reminder set for ${formatDate(ideas.recommendedDate)}`);
  }

  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h2 className="font-serif text-[26px] md:text-[30px] font-semibold leading-tight">Proactive Re-engagement Suggestions</h2>
          <p className="text-fg-2 text-[14px]">Low-pressure ways to stay on {c.name.split(" ")[0]}’s radar, based on your log history.</p>
        </div>
        {aiOk && <Button variant="ai" icon="auto_awesome" disabled={busy} onClick={gen}>{ideas ? "Regenerate" : "Generate ideas"}</Button>}
      </div>
      {busy && <Thinking label="Reading your notes and drafting ideas" />}
      {err && <p className="text-danger text-sm">{err}</p>}
      {aiOk === false && <p className="text-fg-2 text-sm rounded-xl bg-sunken p-4">Follow-up ideas need AI, which isn’t connected in this view. Open NextCup inside Claude, or connect an AI endpoint.</p>}
      {!ideas && !busy && aiOk && <Empty icon="lightbulb" title="No ideas yet">{notes.length ? "Generate three follow-up hooks that tie back to your conversation." : "Log a chat or add a note first; ideas are much better with something to build on."}</Empty>}
      {ideas && !busy && (
        <>
          <div className="rounded-xl ai-glow border border-line p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-caps text-fg-3">Recommended follow-up target</p>
              <p className="text-[20px] font-bold tnum">{formatDate(ideas.recommendedDate)} <span className="text-[14px] font-medium text-fg-2">({fromNow(ideas.recommendedDate)})</span></p>
            </div>
            <Button variant="primary" icon="calendar_add_on" onClick={remind}>Set Calendar Reminder</Button>
          </div>
          <ol className="grid gap-3">
            {ideas.ideas.map((i, idx) => (
              <li key={idx} className="rounded-xl border border-line bg-card-2 p-4 md:p-5 flex gap-4">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-ink text-on-ink font-bold shrink-0 tnum">{idx + 1}</span>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h3 className="font-bold text-[17px]">{i.title}</h3>
                  <p className="font-serif italic text-[17px] leading-snug">“{i.message}”</p>
                  <p className="text-[13px] text-fg-3">{i.why}</p>
                  <div><Button size="sm" variant="ghost" icon="content_copy" onClick={async () => toast((await copyText(i.message)) ? "Copied" : "Select the text to copy it", "ok")}>Copy message</Button></div>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-fg-3">Generated {fromNow(ideas.generatedAt.slice(0, 10))}. AI suggestions can be wrong; check facts before sending.</p>
        </>
      )}
    </Card>
  );
}

function PrepPanel({ c, notes, next }: { c: Contact; notes: Note[]; next?: ChatEvent }) {
  const store = useStore();
  const { openPrep } = useNav();
  const aiOk = useAi();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ctl = useRef<AbortController | null>(null);
  const brief = c.aiPrep;

  async function gen() {
    ctl.current = new AbortController();
    setBusy(true); setErr("");
    try {
      const r = await generatePrepBrief(c, store.profile, notes, ctl.current.signal);
      const latest = store.contactById(c.id) ?? c;
      await store.upsertContact({ ...latest, aiPrep: r, updatedAt: new Date().toISOString() });
    } catch (e) { setErr(aiErrorText(e)); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (aiOk && intent.generatePrepFor === c.id) { intent.generatePrepFor = undefined; gen(); }
    if (aiOk === false && intent.generatePrepFor === c.id) intent.generatePrepFor = undefined;
  }, [aiOk]);
  useEffect(() => () => ctl.current?.abort(), []);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 md:p-7 flex flex-col gap-5 ai-glow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-brand flex items-center gap-1.5"><Icon name="auto_awesome" className="text-[15px]" />AI Prep Brief</p>
            <h2 className="font-serif text-[26px] md:text-[30px] font-semibold leading-tight">{next ? `For ${relativeDay(next.start).toLowerCase() === "today" || relativeDay(next.start).toLowerCase() === "tomorrow" ? relativeDay(next.start).toLowerCase() + "’s" : "your"} chat` : "Before you meet"}</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {aiOk && <Button variant="secondary" icon="forum" onClick={() => openPrep(c.id, next?.id)}>Ask the assistant</Button>}
            {aiOk && <Button variant="primary" icon="bolt" disabled={busy} onClick={gen}>{brief ? "Regenerate" : "Generate brief"}</Button>}
          </div>
        </div>
        {busy && <Thinking label="Building your brief" />}
        {err && <p className="text-danger text-sm">{err}</p>}
        {aiOk === false && <p className="text-fg-2 text-sm rounded-xl bg-card p-4 border border-line">AI briefs aren’t connected in this view. Open NextCup inside Claude, or connect an AI endpoint. Contact notes remain available in the Overview tab.</p>}
        {!brief && !busy && aiOk && <p className="text-fg-2">Generate a brief with an opening line, questions, common ground and an agenda for a {store.profile?.durationMin ?? 30}-minute chat. It uses your profile, your research notes on {c.name.split(" ")[0]} and past debriefs.</p>}
        {brief && !busy && (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl bg-card border border-line p-4">
              <p className="label-caps text-fg-3 mb-1">Suggested opener</p>
              <p className="font-serif italic text-[19px] leading-snug">“{brief.opener}”</p>
            </div>
            <BriefList title="High-value questions" icon="help" items={brief.questions} numbered />
            <BriefList title="Common ground & icebreakers" icon="handshake" items={brief.icebreakers} />
            {brief.agenda.length > 0 && (
              <div>
                <p className="font-bold flex items-center gap-2 mb-2"><Icon name="timer" className="text-brand text-[20px]" />Agenda</p>
                <ol className="rounded-xl border border-line overflow-hidden divide-y divide-line bg-card">
                  {brief.agenda.map((a, i) => (
                    <li key={i} className="flex gap-3 px-4 py-2.5 text-[14px]"><span className="tnum font-bold w-14 shrink-0 text-brand">{a.minutes} min</span><span>{a.item}</span></li>
                  ))}
                </ol>
              </div>
            )}
            <BriefList title="Look up before you go" icon="travel_explore" items={brief.research} />
            <p className="text-[12px] text-fg-3">Generated {fromNow(brief.generatedAt.slice(0, 10))} · AI can be wrong, so double-check anything factual.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function BriefList({ title, icon, items, numbered }: { title: string; icon: string; items: string[]; numbered?: boolean }) {
  if (!items.length) return null;
  const L = numbered ? "ol" : "ul";
  return (
    <div>
      <p className="font-bold flex items-center gap-2 mb-2"><Icon name={icon} className="text-brand text-[20px]" />{title}</p>
      <L className="flex flex-col gap-2">
        {items.map((q, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="tnum text-brand font-bold w-5 shrink-0">{numbered ? `${i + 1}.` : "•"}</span><span>{q}</span>
          </li>
        ))}
      </L>
    </div>
  );
}
