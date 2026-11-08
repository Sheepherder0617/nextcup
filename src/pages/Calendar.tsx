import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Button, Card, Chip, Empty, Icon, Modal, Select, cx, useToast } from "../components/ui";
import { DraftModal } from "../components/DraftModal";
import { RoleChips } from "../components/bits";
import { byStart, isFirstMeet, isOverdue } from "../lib/derive";
import { addDays, formatMonth, fromNow, parseLocal, relativeDay, timeRange, todayISO, formatShort } from "../lib/date";
import { FORMAT_ICON, GOAL_LABEL, KIND_ICON, KIND_LABEL, type ChatEvent, type EventKind } from "../lib/types";
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
    <div className="flex flex-col gap-6 rise">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[36px] md:text-[44px] font-semibold leading-tight">NextCup Calendar</h1>
          <p className="text-fg-2 text-[17px] max-w-[60ch]">Every coffee chat, thank-you note and follow-up in one timeline, built automatically from your contacts and debriefs.</p>
        </div>
        <Button variant="primary" icon="add_circle" onClick={() => go("schedule")} className="self-start md:self-auto">Schedule Coffee Chat</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Card className="p-4 flex items-start gap-3 ai-glow">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-card text-brand border border-line shrink-0"><Icon name="notifications_active" /></span>
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">Calendar reminders <Chip tone="blue">Live</Chip></p>
              <p className="text-[14px] text-fg-2">Use <b>.ics</b> on any chat to add it to your phone calendar with a reminder the day before and 30 minutes before. Open the AI brief the evening before to prep.</p>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="w-full sm:w-52">
              <label htmlFor="cal-range" className="sr-only">Which events</label>
              <Select id="cal-range" value={range} onChange={(e) => { setRange(e.target.value as Range); setDay(null); }}>
                <option value="upcoming">Upcoming ({counts.upcoming})</option>
                <option value="past">Past events ({counts.past})</option>
                <option value="all">All events ({counts.all})</option>
              </Select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by type">
              {(["all", "coffee", "thankyou", "followup"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                  className={cx("inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold border whitespace-nowrap",
                    kind === k ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>
                  {k !== "all" && <Icon name={KIND_ICON[k]} className="text-[16px]" />}
                  {k === "all" ? "All types" : KIND_LABEL[k]}
                  <span className="tnum opacity-70">{k === "all" ? counts[range] : kindCount(k)}</span>
                </button>
              ))}
            </div>
          </div>
          {day && <div><button type="button" onClick={() => setDay(null)} className="inline-flex items-center gap-1.5 rounded-full bg-peach text-on-peach px-3 py-1 text-[13px] font-semibold">Showing {formatShort(day)}<Icon name="close" className="text-[16px]" /></button></div>}

          {groups.length === 0 ? (
            <Card><Empty icon="event_busy" title={range === "past" ? "No past events yet" : "Nothing on the calendar"}
              action={<Button variant="primary" icon="event_available" onClick={() => go("schedule")}>Schedule a coffee chat</Button>}>
              {range === "past" ? "Log a chat after it happens and it shows up here." : "Schedule a chat, or log one that already happened and NextCup will plan your follow-ups."}
            </Empty></Card>
          ) : groups.map(([d, evs]) => (
            <section key={d} className="flex flex-col gap-3" aria-label={relativeDay(d)}>
              <h2 className="text-[15px] font-bold text-fg-2 flex items-center gap-2 mt-2">
                {(() => { const r = relativeDay(d); return ["Today", "Tomorrow", "Yesterday"].includes(r) ? `${r} — ${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(parseLocal(d))}` : r; })()}
                {evs.some((e) => e.kind === "coffee" && e.status === "planned" && parseLocal(e.start).getTime() - Date.now() < 48 * 3600000 && !store.contactById(e.contactId)?.aiPrep) && <Chip tone="danger">Urgent Prep</Chip>}
              </h2>
              {evs.map((e) => <EventCard key={e.id} e={e} first={isFirstMeet(e, store.events)}
                onPrep={() => openPrep(e.contactId, e.id)} onLog={() => openLog({ eventId: e.id })} onDraft={() => setDraftId(e.id)}
                onDone={() => markDone(e)} onDelete={() => setDel(e)} onOpen={() => go("contact", e.contactId)} />)}
            </section>
          ))}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <MiniMonth month={month} setMonth={setMonth} events={store.events} selected={day} onPick={(d) => { setDay(d === day ? null : d); setRange("all"); }} />
          <Card className="p-4 bg-card-2">
            <p className="font-semibold flex items-center gap-2"><Icon name="tips_and_updates" className="text-brand" />First Meet Tip</p>
            <p className="text-[14px] text-fg-2 mt-1">In a first coffee chat, spend the first five minutes listening to their career story before you share your own pitch.</p>
          </Card>
        </aside>
      </div>

      <DraftModal eventId={draftId} onClose={() => setDraftId(null)} />
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

function EventCard({ e, first, onPrep, onLog, onDraft, onDone, onDelete, onOpen }:
  { e: ChatEvent; first: boolean; onPrep: () => void; onLog: () => void; onDraft: () => void; onDone: () => void; onDelete: () => void; onOpen: () => void }) {
  const store = useStore();
  const c = store.contactById(e.contactId);
  if (!c) return null;
  const overdue = isOverdue(e);
  const past = e.status === "planned" && e.kind === "coffee" && parseLocal(e.start).getTime() + e.durationMin * 60000 < Date.now();
  return (
    <Card className={cx("p-4 md:p-5 flex flex-col gap-3", e.status === "done" && "opacity-80")}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={e.kind === "coffee" ? "peach" : e.kind === "thankyou" ? "sand" : "blue"} icon={KIND_ICON[e.kind]}>{KIND_LABEL[e.kind]}</Chip>
        {first && e.kind === "coffee" && <Chip tone="ink" icon="star">First Meet</Chip>}
        {e.status === "done" && <Chip tone="blue" icon="check">Done</Chip>}
        {overdue && <Chip tone="danger">Overdue</Chip>}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <button type="button" onClick={onOpen} className="text-[18px] font-bold hover:text-brand">{c.name}</button>
        {(c.title || c.company) && <span className="text-fg-2">• {c.title}{c.title && c.company ? ", " : ""}{c.company}</span>}
      </div>
      <div className="flex flex-col gap-1 text-[14px] text-fg-2">
        <span className="inline-flex items-center gap-2 tnum"><Icon name="schedule" className="text-[18px] text-fg-3" />{e.kind === "coffee" ? `${timeRange(e.start, e.durationMin)} (${e.durationMin} mins)` : `Due ${fromNow(e.start)}`}</span>
        {(e.location || e.link) && <span className="inline-flex items-center gap-2 min-w-0"><Icon name={e.format ? FORMAT_ICON[e.format] : "place"} className="text-[18px] text-fg-3" />
          {e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="text-brand font-semibold truncate">{e.location || e.link}</a> : <span className="truncate">{e.location}</span>}</span>}
        {e.topic && <span className="inline-flex items-start gap-2"><Icon name="psychology" className="text-[18px] text-fg-3" />{e.topic}</span>}
      </div>
      {(c.roleTypes.length > 0 || c.goals.length > 0) && <div className="flex flex-wrap gap-1.5"><RoleChips roles={c.roleTypes.slice(0, 2)} school={c.school} />{c.goals[0] && <Chip tone="neutral">{GOAL_LABEL[c.goals[0]]}</Chip>}</div>}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-line">
        {e.kind === "coffee" && e.status === "planned" && <>
          {!past && <Button size="sm" variant="ai" icon="psychology" onClick={onPrep}>Coffee Chat AI Prep</Button>}
          <Button size="sm" variant={past ? "primary" : "secondary"} icon="edit_note" onClick={onLog}>Post Meeting Note</Button>
          {!past && <Button size="sm" variant="ghost" icon="event" onClick={() => saveFile(`coffee-chat-${c.name.split(" ")[0].toLowerCase()}.ics`, eventToIcs(e, c), "text/calendar")}>.ics</Button>}
        </>}
        {e.kind !== "coffee" && e.status === "planned" && <>
          <Button size="sm" variant="secondary" icon={e.kind === "thankyou" ? "mark_email_read" : "lightbulb"} onClick={onDraft}>{e.kind === "thankyou" ? "Write thank-you" : "Write follow-up"}</Button>
          <Button size="sm" variant="ghost" icon="check" onClick={onDone}>Mark done</Button>
        </>}
        {e.status === "done" && <Button size="sm" variant="ghost" icon="description" onClick={onOpen}>View in profile</Button>}
        <Button size="sm" variant="ghost" icon="delete" onClick={onDelete} className="ml-auto text-fg-3" aria-label="Delete event">Delete</Button>
      </div>
    </Card>
  );
}

function MiniMonth({ month, setMonth, events, selected, onPick }: { month: Date; setMonth: (d: Date) => void; events: ChatEvent[]; selected: string | null; onPick: (d: string) => void }) {
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
      {monthEvents.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-line flex flex-col gap-1.5 text-[13px]">
          {monthEvents.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2"><span className={cx("w-2 h-2 rounded-full", e.status === "done" ? "bg-blue" : "bg-brand")} />
              <span className="font-semibold tnum">{formatShort(e.start)}</span><span className="text-fg-2 truncate">{store.contactById(e.contactId)?.name}</span></li>
          ))}
        </ul>
      )}
    </Card>
  );
}
