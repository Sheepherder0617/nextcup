import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Button, Card, Chip, Empty, Icon, Input, Label, Modal, Select, cx, useToast } from "../components/ui";
import { DraftModal } from "../components/DraftModal";
import { RoleChips } from "../components/bits";
import { byStart, isFirstMeet, isOverdue } from "../lib/derive";
import { addDays, formatMonth, fromNow, parseLocal, relativeDay, timeRange, todayISO, formatShort } from "../lib/date";
import { FORMAT_ICON, FORMAT_LABEL, GOAL_LABEL, KIND_ICON, KIND_LABEL, type ChatEvent, type EventKind, type Format } from "../lib/types";
import { eventToIcs, saveFile } from "../lib/files";

type Range = "upcoming" | "past" | "all";

export function CalendarPage() {
  const store = useStore();
  const { go, openLog, openPrep } = useNav();
  const toast = useToast();
  const [range, setRange] = useState<Range>("upcoming");
  const [kind, setKind] = useState<"all" | EventKind>("all");
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [del, setDel] = useState<ChatEvent | null>(null);
  const [editEvent, setEditEvent] = useState<ChatEvent | null>(null);
  const [delNotes, setDelNotes] = useState(false);

  // "Upcoming" = still to do (including overdue tasks); "Past" = done.
  const inRange = (e: ChatEvent, r: Range) => (r === "all" ? true : r === "upcoming" ? e.status === "planned" : e.status === "done");
  const counts = { upcoming: store.events.filter((e) => inRange(e, "upcoming")).length, past: store.events.filter((e) => inRange(e, "past")).length, all: store.events.length };

  const list = useMemo(() => {
    let l = store.events.filter((e) => inRange(e, range));
    if (kind !== "all") l = l.filter((e) => e.kind === kind);
    if (day) l = l.filter((e) => e.start.startsWith(day));
    l.sort(byStart);
    if (range === "past") l.reverse();
    return l;
  }, [store.events, range, kind, day]);

  const groups = useMemo(() => {
    const m = new Map<string, ChatEvent[]>();
    list.forEach((e) => { const k = e.start.slice(0, 10); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [list]);

  const kindCount = (k: EventKind) => store.events.filter((e) => inRange(e, range) && e.kind === k).length;

  async function markDone(e: ChatEvent) {
    await store.upsertEvent({ ...e, status: "done" });
    const c = store.contactById(e.contactId);
    if (c && (!c.lastContact || c.lastContact < todayISO())) await store.upsertContact({ ...c, lastContact: todayISO(), updatedAt: new Date().toISOString() });
    toast(`${KIND_LABEL[e.kind]} marked as done`);
  }
  async function confirmDelete() {
    if (!del) return;
    await store.deleteEvent(del.id, delNotes);
    toast("Event deleted");
    setDel(null); setDelNotes(false);
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5 rise">
      {/* Phone: title, reminders and schedule on one row */}
      <div className="md:hidden flex items-center gap-2">
        <h1 className="flex-1 min-w-0 font-serif text-[28px] font-semibold leading-tight">Calendar</h1>
        <EmailReminders compact />
        <button type="button" onClick={() => go("schedule")} className="shrink-0 inline-flex items-center gap-1 h-10 pl-3 pr-3.5 rounded-full bg-ink text-on-ink text-[14px] font-semibold shadow-soft">
          <Icon name="add" className="text-[20px]" />Schedule
        </button>
      </div>
      <div className="hidden md:flex flex-row items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] font-semibold leading-tight">NextCup Calendar</h1>
          <p className="text-fg-2 text-[15px] max-w-[60ch]">Every coffee chat, thank-you note and follow-up in one timeline.</p>
        </div>
        <Button variant="primary" icon="add_circle" onClick={() => go("schedule")}>Schedule Event</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="hidden md:block"><EmailReminders /></div>

          <div className="calendar-mobile-month">
            <PhoneCalendar month={month} setMonth={setMonth} events={store.events} selected={day} onPick={(d) => { setDay(d === day ? null : d); setRange("all"); }} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="hidden md:block w-full sm:w-52">
              <label htmlFor="cal-range" className="sr-only">Which events</label>
              <Select id="cal-range" value={range} onChange={(e) => { setRange(e.target.value as Range); setDay(null); }}>
                <option value="upcoming">Upcoming ({counts.upcoming})</option>
                <option value="past">Past events ({counts.past})</option>
                <option value="all">All events ({counts.all})</option>
              </Select>
            </div>
            <div className="calendar-filter-scroll flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by type">
              {/* Phone: upcoming / past toggle replaces the dropdown */}
              <span className="md:hidden shrink-0 inline-flex h-9 p-0.5 rounded-full bg-sunken border border-line">
                {(["upcoming", "past"] as const).map((r) => (
                  <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setDay(null); }}
                    className={cx("px-3 rounded-full text-[13px] font-semibold whitespace-nowrap transition", range === r ? "bg-card text-fg shadow-soft" : "text-fg-3")}>
                    {r === "upcoming" ? "Upcoming" : "Past"}
                  </button>
                ))}
              </span>
              <span aria-hidden="true" className="md:hidden shrink-0 w-px my-1.5 bg-line-2" />
              {(["all", "coffee", "thankyou", "followup"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                  className={cx("inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold border whitespace-nowrap",
                    kind === k ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>
                  {k !== "all" && <Icon name={KIND_ICON[k]} className="text-[16px]" />}
                  {k === "all" ? <><span className="md:hidden">All</span><span className="hidden md:inline">All types</span></> : KIND_LABEL[k]}
                  <span className="tnum opacity-70">{k === "all" ? counts[range] : kindCount(k)}</span>
                </button>
              ))}
            </div>
          </div>
          {day && <div><button type="button" onClick={() => setDay(null)} className="inline-flex items-center gap-1.5 rounded-full bg-peach text-on-peach px-3 py-1 text-[13px] font-semibold">Showing {formatShort(day)}<Icon name="close" className="text-[16px]" /></button></div>}

          {groups.length === 0 ? (
            <Card><Empty icon="event_busy" title={range === "past" ? "No past events yet" : "Nothing on the calendar"}
              action={<Button variant="primary" icon="event_available" onClick={() => go("schedule")}>Schedule an event</Button>}>
              {range === "past" ? "Log a chat after it happens and it shows up here." : "Schedule an event, or log one that already happened to add it to your calendar."}
            </Empty></Card>
          ) : groups.map(([d, evs]) => (
            <section key={d} className="flex flex-col gap-2 md:gap-3" aria-label={relativeDay(d)}>
              <h2 className="text-[14px] md:text-[15px] font-bold text-fg-2 flex items-center gap-2 md:mt-2">
                {(() => { const r = relativeDay(d); return ["Today", "Tomorrow", "Yesterday"].includes(r) ? `${r} — ${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(parseLocal(d))}` : r; })()}
                {evs.some((e) => e.kind === "coffee" && e.status === "planned" && parseLocal(e.start).getTime() - Date.now() < 48 * 3600000 && !store.contactById(e.contactId)?.aiPrep) && <Chip tone="danger">Urgent Prep</Chip>}
              </h2>
              {evs.map((e) => <EventCard key={e.id} e={e} first={isFirstMeet(e, store.events)}
                onPrep={() => openPrep(e.contactId, e.id)} onLog={() => openLog({ eventId: e.id })} onDraft={() => setDraftId(e.id)}
                onDone={() => markDone(e)} onEdit={() => setEditEvent(e)} onDelete={() => setDel(e)} onOpen={() => go("contact", e.contactId)} />)}
            </section>
          ))}
        </div>

        <aside className="calendar-sidebar flex flex-col gap-4 lg:sticky lg:top-24">
          <MiniMonth month={month} setMonth={setMonth} events={store.events} selected={day} onPick={(d) => { setDay(d === day ? null : d); setRange("all"); }} />
        </aside>
      </div>

      <DraftModal eventId={draftId} onClose={() => setDraftId(null)} />
      {editEvent && <EditCoffeeChatModal key={editEvent.id} event={editEvent} onClose={() => setEditEvent(null)} onSave={async (updated) => {
        await store.upsertEvent(updated);
        toast("Coffee chat updated");
        setEditEvent(null);
      }} />}
      <Modal open={!!del} onClose={() => setDel(null)} labelledBy="del-ev" title="Delete scheduled event?"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" icon="delete" onClick={confirmDelete}>Delete event</Button></>}>
        {del && <div className="flex flex-col gap-4">
          <p className="text-fg-2">Remove your {KIND_LABEL[del.kind].toLowerCase()} with <b className="text-fg">{store.contactById(del.contactId)?.name}</b> on <b className="text-fg">{relativeDay(del.start)}</b>? This can’t be undone.</p>
          <label htmlFor="del-notes" className="flex gap-3 items-start text-[14px] cursor-pointer rounded-xl bg-sunken p-3">
            <input id="del-notes" type="checkbox" checked={delNotes} onChange={(e) => setDelNotes(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--brand-2)]" />
            Also permanently remove notes linked to this event
          </label>
        </div>}
      </Modal>
    </div>
  );
}

function EventCard({ e, first, onPrep, onLog, onDraft, onDone, onEdit, onDelete, onOpen }:
  { e: ChatEvent; first: boolean; onPrep: () => void; onLog: () => void; onDraft: () => void; onDone: () => void; onEdit: () => void; onDelete: () => void; onOpen: () => void }) {
  const store = useStore();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [open, setOpen] = useState(false); // phone: details collapsed by default
  const c = store.contactById(e.contactId);
  if (!c) return null;
  const overdue = isOverdue(e);
  const past = e.status === "planned" && e.kind === "coffee" && parseLocal(e.start).getTime() + e.durationMin * 60000 < Date.now();
  return (
    <Card className={cx("px-3.5 py-3 md:p-4 flex flex-col gap-2 md:gap-2.5", e.status === "done" && "opacity-80")}>
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
        <Chip tone={e.kind === "coffee" ? "peach" : e.kind === "thankyou" ? "neutral" : "blue"} icon={KIND_ICON[e.kind]}>{KIND_LABEL[e.kind]}</Chip>
        {first && e.kind === "coffee" && <Chip tone="ink" icon="star">First Meet</Chip>}
        {e.status === "done" && <Chip tone="blue" icon="check">Done</Chip>}
        {overdue && <Chip tone="danger">Overdue</Chip>}
        {/* Phone: time sits in the chip row */}
        <span className="md:hidden ml-auto text-[12.5px] font-semibold text-fg-2 tnum">{e.kind === "coffee" ? timeRange(e.start, e.durationMin).split(/\s*[\u2013-]\s*/)[0] : `Due ${fromNow(e.start)}`}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
        <button type="button" onClick={onOpen} className="text-[17px] md:text-[18px] font-bold hover:text-brand">{c.name}</button>
        {e.title && <span className={cx("text-fg-2 text-[14px] md:text-[16px]", !open && "max-md:truncate max-md:max-w-full")}>· {e.title}</span>}
        {(c.title || c.company) && <span className={cx("text-fg-2", !open && "max-md:hidden")}>• {c.title}{c.title && c.company ? ", " : ""}{c.company}</span>}
      </div>
      <div className={cx("flex-col gap-1 text-[14px] text-fg-2 md:flex", open ? "flex" : "hidden")}>
        <span className="inline-flex items-center gap-2 tnum"><Icon name="schedule" className="text-[18px] text-fg-3" />{e.kind === "coffee" ? `${timeRange(e.start, e.durationMin)} (${e.durationMin} mins)` : `Due ${fromNow(e.start)}`}</span>
        {(e.location || e.link) && <span className="inline-flex items-center gap-2 min-w-0"><Icon name={e.format ? FORMAT_ICON[e.format] : "place"} className="text-[18px] text-fg-3" />
          {e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="text-brand font-semibold truncate">{e.location || e.link}</a> : <span className="truncate">{e.location}</span>}</span>}
        {e.topic && <span className="inline-flex items-start gap-2"><Icon name="psychology" className="text-[18px] text-fg-3" />{e.topic}</span>}
      </div>
      {(c.roleTypes.length > 0 || c.goals.length > 0) && <div className={cx("flex-wrap gap-1.5 md:flex", open ? "flex" : "hidden")}><RoleChips roles={c.roleTypes.slice(0, 2)} school={c.school} />{c.goals[0] && <Chip tone="neutral">{GOAL_LABEL[c.goals[0]]}</Chip>}</div>}
      <div className={cx("flex flex-wrap items-center gap-2 md:pt-3 md:border-t md:border-line", open && "max-md:pt-2 max-md:border-t max-md:border-line")}>
        {e.kind === "coffee" && e.status === "planned" && <>
          {!past && <Button size="sm" variant="ai" icon="psychology" onClick={onPrep}><span className="md:hidden">AI Prep</span><span className="hidden md:inline">Coffee Chat AI Prep</span></Button>}
          <span className={cx(!past && !open && "max-md:hidden")}><Button size="sm" variant={past ? "primary" : "secondary"} icon="edit_note" onClick={onLog}>Log a Chat</Button></span>
          {!past && <Button size="sm" variant="ghost" icon="event" className={cx(!open && "max-md:!hidden")} onClick={() => saveFile(`coffee-chat-${c.name.split(" ")[0].toLowerCase()}.ics`, eventToIcs(e, c), "text/calendar")}>.ics</Button>}
        </>}
        {e.kind !== "coffee" && e.status === "planned" && <>
          <Button size="sm" variant="secondary" icon={e.kind === "thankyou" ? "mark_email_read" : "lightbulb"} onClick={onDraft}>{e.kind === "thankyou" ? "Write thank-you" : "Write follow-up"}</Button>
          <span className={cx(!open && "max-md:hidden")}><Button size="sm" variant="ghost" icon="check" onClick={onDone}>Mark done</Button></span>
        </>}
        {e.status === "done" && <Button size="sm" variant="ghost" icon="description" onClick={onOpen}>View in profile</Button>}
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="md:hidden ml-auto inline-flex items-center gap-0.5 h-8 px-2 rounded-full text-[12.5px] font-semibold text-fg-3">
          {open ? "Less" : "Details"}<Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" />
        </button>
        <div className="relative md:ml-auto">
          <Button size="sm" variant="ghost" icon="more_vert" onClick={() => setActionsOpen((open) => !open)} className="text-fg-3"
            aria-label="Event actions" aria-haspopup="menu" aria-expanded={actionsOpen} title="Event actions" />
          {actionsOpen && <div role="menu" className="absolute right-0 bottom-full z-20 mb-1 min-w-44 rounded-lg border border-line bg-card p-1 shadow-lift">
            {e.kind === "coffee" && <button type="button" role="menuitem" onClick={() => { setActionsOpen(false); onEdit(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-card-2"><Icon name="edit" className="text-[18px]" />Edit coffee chat</button>}
            <button type="button" role="menuitem" onClick={() => { setActionsOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"><Icon name="delete" className="text-[18px]" />Delete event</button>
          </div>}
        </div>
      </div>
    </Card>
  );
}

function EditCoffeeChatModal({ event, onClose, onSave }: { event: ChatEvent; onClose: () => void; onSave: (event: ChatEvent) => Promise<void> }) {
  const [date, setDate] = useState(event.start.slice(0, 10));
  const [time, setTime] = useState(event.start.slice(11, 16));
  const [duration, setDuration] = useState(event.durationMin);
  const [format, setFormat] = useState<Format>(event.format ?? "video");
  const [title, setTitle] = useState(event.title ?? event.topic ?? "");
  const [link, setLink] = useState(event.link ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !date || !time) return;
    setBusy(true);
    try {
      await onSave({
        ...event,
        start: `${date}T${time}`,
        durationMin: duration,
        format,
        title: title.trim(),
        link: format === "video" ? link.trim() || undefined : undefined,
        location: format === "video" ? undefined : location.trim() || undefined,
      });
    } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} wide title="Edit coffee chat" labelledBy="edit-coffee-title"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="check" onClick={save} disabled={busy || !title.trim() || !date || !time}>{busy ? "Saving…" : "Save changes"}</Button></>}>
      <div className="flex flex-col gap-4">
        <div><Label htmlFor="edit-coffee-name" hint="Required">Title</Label><Input id="edit-coffee-name" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="edit-coffee-date">Date</Label><Input id="edit-coffee-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div><Label htmlFor="edit-coffee-time">Time</Label><Input id="edit-coffee-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="edit-coffee-format">Format</Label>
            <Select id="edit-coffee-format" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              {(Object.keys(FORMAT_LABEL) as Format[]).map((item) => <option key={item} value={item}>{FORMAT_LABEL[item]}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="edit-coffee-duration">Duration</Label>
            <Select id="edit-coffee-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[15, 30, 45, 60].map((mins) => <option key={mins} value={mins}>{mins} minutes</option>)}
            </Select>
          </div>
        </div>
        {format === "video" ? (
          <div><Label htmlFor="edit-coffee-link" hint="Optional">Meeting link</Label><Input id="edit-coffee-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/…" /></div>
        ) : (
          <div><Label htmlFor="edit-coffee-location" hint="Optional">{format === "inperson" ? "Location" : "Phone number"}</Label><Input id="edit-coffee-location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        )}
      </div>
    </Modal>
  );
}

/** Phone: a one-week strip by default; tap "Month" to expand the full month grid. */
function PhoneCalendar({ month, setMonth, events, selected, onPick }: { month: Date; setMonth: (d: Date) => void; events: ChatEvent[]; selected: string | null; onPick: (d: string) => void }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem("nextcup:cal-open") === "1"; } catch { return false; } });
  const [anchor, setAnchor] = useState(() => parseLocal(selected ?? todayISO()));
  const toggle = () => { const v = !open; setOpen(v); try { localStorage.setItem("nextcup:cal-open", v ? "1" : "0"); } catch { /* ignore */ } };
  const weekStart = addDays(anchor, -anchor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayISO();
  const byDay = new Map<string, ChatEvent[]>();
  events.forEach((e) => { const k = e.start.slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), e]); });
  const shift = (n: number) => { const d = addDays(anchor, n); setAnchor(d); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const pick = (k: string) => { setAnchor(parseLocal(k)); onPick(k); };

  if (open) return (
    <div className="flex flex-col gap-2">
      <MiniMonth month={month} setMonth={setMonth} events={events} selected={selected} onPick={pick} compact />
      <button type="button" onClick={toggle} aria-expanded="true" className="self-center inline-flex items-center gap-1 h-8 px-3.5 rounded-full bg-card border border-line text-[13px] font-semibold text-fg-2">
        <Icon name="expand_less" className="text-[18px]" />Show week only
      </button>
    </div>
  );

  return (
    <Card className="px-2.5 pt-2.5 pb-2">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <h2 className="font-serif text-[17px] min-[380px]:text-[18px] font-semibold whitespace-nowrap">{formatMonth(weekStart)}</h2>
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" icon="chevron_left" aria-label="Previous week" onClick={() => shift(-7)} />
          <Button size="sm" variant="ghost" icon="chevron_right" aria-label="Next week" onClick={() => shift(7)} />
          <button type="button" onClick={toggle} aria-expanded="false" className="ml-1 inline-flex items-center gap-0.5 h-8 px-2.5 rounded-full bg-sunken text-[12px] font-bold text-fg-2">
            Month<Icon name="expand_more" className="text-[18px]" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = todayISO(d); const evs = byDay.get(k) ?? []; const sel = selected === k;
          return (
            <button key={k} type="button" onClick={() => pick(k)} aria-pressed={sel}
              aria-label={`${formatShort(d)}${evs.length ? `, ${evs.length} event${evs.length > 1 ? "s" : ""}` : ""}`}
              className={cx("relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition",
                sel ? "bg-ink text-on-ink" : k === today ? "bg-peach text-on-peach" : "hover:bg-sunken")}>
              <span className={cx("text-[10px] font-bold uppercase", sel ? "text-on-ink/80" : "text-fg-3")}>{"SMTWTFS"[d.getDay()]}</span>
              <span className="text-[15px] font-semibold tnum leading-none">{d.getDate()}</span>
              <span className="h-1.5 flex gap-0.5">
                {evs.slice(0, 3).map((e) => <span key={e.id} className={cx("w-1 h-1 rounded-full", sel ? "bg-on-ink" : e.kind === "coffee" ? "bg-brand" : "bg-blue")} />)}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function MiniMonth({ month, setMonth, events, selected, onPick, compact }: { month: Date; setMonth: (d: Date) => void; events: ChatEvent[]; selected: string | null; onPick: (d: string) => void; compact?: boolean }) {
  const startDow = month.getDay();
  const gridStart = addDays(month, -startDow);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const trimmed = days[35].getMonth() !== month.getMonth() ? days.slice(0, 35) : days;
  const today = todayISO();
  const byDay = new Map<string, ChatEvent[]>();
  events.forEach((e) => { const k = e.start.slice(0, 10); byDay.set(k, [...(byDay.get(k) ?? []), e]); });
  const monthEvents = events.filter((e) => e.kind === "coffee" && e.start.startsWith(todayISO(month).slice(0, 7))).sort(byStart);
  const store = useStore();
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-[20px] font-semibold">{formatMonth(month)}</h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon="chevron_left" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
          <Button size="sm" variant="ghost" icon="chevron_right" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-fg-3 mb-1">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {trimmed.map((d) => {
          const k = todayISO(d);
          const evs = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button key={k} type="button" onClick={() => onPick(k)} aria-label={`${formatShort(d)}${evs.length ? `, ${evs.length} event${evs.length > 1 ? "s" : ""}` : ""}`} aria-pressed={selected === k}
              className={cx("relative h-10 rounded-lg text-[13px] tnum transition",
                selected === k ? "bg-ink text-on-ink font-bold" : k === today ? "bg-peach text-on-peach font-bold" : inMonth ? "hover:bg-sunken" : "text-fg-3/60 hover:bg-sunken")}>
              {d.getDate()}
              {evs.length > 0 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                {evs.slice(0, 3).map((e) => <span key={e.id} className={cx("w-1 h-1 rounded-full", selected === k ? "bg-on-ink" : e.kind === "coffee" ? "bg-brand" : "bg-blue")} />)}
              </span>}
            </button>
          );
        })}
      </div>
      {!compact && monthEvents.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-line flex flex-col gap-1.5 text-[13px]">
          {monthEvents.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2"><span className={cx("w-2 h-2 rounded-full", e.status === "done" ? "bg-blue" : "bg-brand")} />
              <span className="font-semibold tnum">{formatShort(e.start)}</span><span className="text-fg-2 truncate">{[store.contactById(e.contactId)?.name, e.title].filter(Boolean).join(" · ")}</span></li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Email reminder setting. Saved on the profile; sending is not built yet, so this only stores the choice. */
function EmailReminders({ compact }: { compact?: boolean }) {
  const store = useStore();
  const p = store.profile;
  const on = p?.emailReminders ?? true;
  const [info, setInfo] = useState(false);
  function set(v: boolean) { if (p) store.saveProfile({ ...p, emailReminders: v }); }
  const toast = useToast();
  if (compact) return (
    <button type="button" role="switch" aria-checked={on} aria-label="Email reminders the day before each chat"
      onClick={() => { set(!on); toast(!on ? "Email reminders on: you’ll get an email the day before each coffee chat." : "Email reminders off"); }}
      className={cx("shrink-0 inline-flex items-center gap-1 h-10 px-3 rounded-full border text-[13px] font-semibold transition",
        on ? "bg-peach text-on-peach border-transparent" : "bg-card text-fg-3 border-line")}>
      <Icon name={on ? "notifications_active" : "notifications_off"} className="text-[19px]" />{on ? "On" : "Off"}
    </button>
  );
  return (
    <Card className="px-3.5 py-2.5 md:p-4 flex items-center md:items-start gap-3 ai-glow">
      <span className={cx("grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-xl border shrink-0 transition", on ? "bg-peach text-on-peach border-transparent" : "bg-card text-fg-3 border-line")}>
        <Icon name={on ? "notifications_active" : "notifications_off"} />
      </span>
      <div className="flex-1 min-w-0">
        {/* Phone: tap the title to show what it does */}
        <button type="button" onClick={() => setInfo(!info)} aria-expanded={info} className="md:hidden font-semibold flex items-center gap-2 text-left">Email reminders
          <span aria-hidden="true" className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold transition",
            on ? "bg-blue-soft text-on-blue-soft" : "bg-sunken text-fg-3 border border-line")}>
            <span className={cx("w-1.5 h-1.5 rounded-full", on ? "bg-blue" : "bg-fg-3")} />{on ? "On" : "Off"}
          </span>
          <Icon name="info" className="text-[17px] text-fg-3" />
        </button>
        <p className="hidden md:flex font-semibold items-center gap-2">Email reminders
          <span aria-hidden="true" className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold transition",
            on ? "bg-blue-soft text-on-blue-soft" : "bg-sunken text-fg-3 border border-line")}>
            <span className={cx("w-1.5 h-1.5 rounded-full", on ? "bg-blue" : "bg-fg-3")} />{on ? "On" : "Off"}
          </span>
        </p>
        <p className={cx("text-[13px] md:text-[14px] text-fg-2 mt-1 md:mt-0 md:block", info ? "block" : "hidden")}>Get an email the day before each coffee chat with your AI prep brief and talking points.</p>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label="Email reminders" onClick={() => set(!on)}
        className={cx("relative shrink-0 md:mt-1 w-12 h-7 rounded-full transition", on ? "bg-ink" : "bg-line-2")}>
        <span className={cx("absolute top-1 left-1 w-5 h-5 rounded-full bg-card shadow-soft transition-transform", on && "translate-x-5")} />
      </button>
    </Card>
  );
}
