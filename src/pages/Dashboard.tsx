import { useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Icon, cx } from "../components/ui";
import { DraftModal } from "../components/DraftModal";
import { dueTasks, inThisWeek, isOverdue, lastContactOf, needsDebrief, upcomingChats } from "../lib/derive";
import { formatTime, fromNow, greeting, parseLocal, relativeDay, timeRange } from "../lib/date";
import { FORMAT_LABEL, type ChatEvent, type Contact } from "../lib/types";
import { eventToIcs, saveFile } from "../lib/files";

export function Dashboard() {
  const store = useStore();
  const { go, openLog, openPrep } = useNav();
  const now = new Date();
  const first = store.profile?.name.split(" ")[0] ?? "";
  const chats = upcomingChats(store.events, now);
  const next = chats[0];
  const nextContact = next ? store.contactById(next.contactId) : undefined;
  const weekChats = chats.filter((e) => inThisWeek(e, now)).length;
  const tasks = dueTasks(store.events, 7, now);
  const unlogged = needsDebrief(store.events, now);
  const within24 = next ? parseLocal(next.start).getTime() - now.getTime() < 86400000 : false;
  const [draftId, setDraftId] = useState<string | null>(null);
  const nContacts = store.contacts.length;
  const nLogged = store.events.filter((e) => e.kind === "coffee" && e.status === "done").length;
  const stats = [
    { label: "Total contacts", value: `${nContacts} Contact${nContacts === 1 ? "" : "s"}`, icon: "group" },
    { label: "Completed chats", value: `${nLogged} Logged`, icon: "local_cafe" },
    { label: "Upcoming chats", value: `${chats.length} Scheduled`, icon: "calendar_month" },
  ];
  const upNext = buildUpNext(store.events, store.contactById, now);

  return (
    <div className="flex flex-col gap-4 md:gap-5 rise">
      {/* Phone: one line greeting, then "what should I do next?" */}
      <div className="md:hidden flex flex-col gap-4">
        <h1 className="font-serif text-[26px] leading-tight font-semibold tracking-[-0.015em] truncate">{greeting(now)}, {first}</h1>
        <Card className="grid grid-cols-3 divide-x divide-line py-2.5">
          {[[nContacts, nContacts === 1 ? "Contact" : "Contacts"], [nLogged, "Logged"], [chats.length, "Upcoming"]].map(([n, l]) => (
            <div key={l} className="text-center min-w-0 px-1">
              <p className="font-serif text-[22px] font-semibold leading-none tnum">{n}</p>
              <p className="text-[12px] text-fg-3 font-semibold mt-1">{l}</p>
            </div>
          ))}
        </Card>
        <UpNext items={upNext} hasContacts={nContacts > 0}
          onAct={(it) => it.type === "debrief" ? openLog({ eventId: it.e.id }) : it.type === "chat" ? openPrep(it.c.id, it.e.id) : setDraftId(it.e.id)}
          onSeeAll={() => go("calendar")} onEmpty={() => go(nContacts ? "schedule" : "add-contact")} />
        <QuickActions onAdd={() => go("add-contact")} onSchedule={() => go("schedule")} onLog={() => openLog()} />
        <Reconnect contacts={store.contacts} events={store.events} busyIds={new Set(upNext.map((it) => it.c.id))}
          onOpen={(id) => go("contact", id)} onAll={() => go("contacts")} />
        <GettingStarted steps={[
          { done: nContacts >= 3, label: "Add 3 people you want to stay in touch with", note: `${Math.min(nContacts, 3)}/3`, on: () => go("add-contact") },
          { done: store.events.some((e) => e.kind === "coffee"), label: "Schedule your first coffee chat", on: () => go("schedule") },
          { done: store.notes.length > 0, label: "Log a chat and let AI tidy your notes", on: () => openLog() },
          { done: (store.profile?.targetRoles.length ?? 0) > 0, label: "Add your target roles so AI briefs fit you", on: () => go("profile") },
        ]} />
        <TipCard now={now} />
      </div>

      {/* Tablet & desktop */}
      <div className="hidden md:flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[28px] md:text-[34px] leading-tight font-semibold tracking-[-0.015em] flex items-center gap-3">
          {greeting(now)}, {first}! <Icon name="local_cafe" className="text-brand-2 text-[22px] md:text-[24px]" />
        </h1>
        <p className="text-fg-2 text-[15px] max-w-[62ch]">
          You have <b className="text-fg">{weekChats} coffee chat{weekChats === 1 ? "" : "s"}</b> scheduled this week and{" "}
          <b className="text-fg">{tasks.length} follow-up{tasks.length === 1 ? "" : "s"}</b> due in the next 7 days.
        </p>
      </div>

      <div className="dashboard-stats grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="label-caps text-fg-3">{s.label}</p>
              <p className="font-serif text-[20px] md:text-[22px] font-semibold mt-0.5 tnum">{s.value}</p>
            </div>
            <span className="dashboard-stat-icon grid place-items-center w-9 h-9 rounded-lg shrink-0 bg-peach text-on-peach"><Icon name={s.icon} className="text-[20px]" /></span>
          </Card>
        ))}
      </div>

      {/* Next chat */}
      <Card className="p-1.5 bg-card-2">
        {next && nextContact ? (
          <div className="rounded-xl bg-card border border-line p-3.5 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <span className="hidden sm:grid place-items-center w-10 h-10 rounded-xl bg-peach text-on-peach shrink-0"><Icon name="connect_without_contact" /></span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-2 font-semibold">
                <Chip tone={within24 ? "peach" : "blue"}>{within24 ? "UPCOMING IN 24H" : "NEXT CHAT"}</Chip>
                <span className="tnum">{relativeDay(next.start)} · {timeRange(next.start, next.durationMin)}</span>
                {next.format && <span>· {FORMAT_LABEL[next.format]}</span>}
              </div>
              <h2 className="text-[18px] font-bold mt-1">Coffee Chat with {nextContact.name}</h2>
              <p className="text-fg-2 text-[15px]">{[nextContact.title && `${nextContact.title}${nextContact.company ? " at " + nextContact.company : ""}`, next.topic && `Topic: ${next.topic}`].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {next.link && <a href={next.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-ink text-on-ink text-sm font-semibold"><Icon name="videocam" className="text-[18px]" />Join meeting</a>}
              <Button variant="soft" iconRight="arrow_forward" onClick={() => openPrep(nextContact.id, next.id)}>Pre-Meeting Brief</Button>
              <Button variant="ghost" icon="event" onClick={() => saveFile(`coffee-chat-${nextContact.name.split(" ")[0].toLowerCase()}.ics`, eventToIcs(next, nextContact), "text/calendar")} aria-label="Add to my calendar">.ics</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-line p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-peach text-on-peach shrink-0"><Icon name="event_available" /></span>
            <div className="flex-1">
              <h2 className="text-[17px] font-bold">No coffee chats on the calendar</h2>
              <p className="text-fg-2 text-[15px]">{store.contacts.length ? "Pick someone from your contacts and set up the next conversation." : "Start by adding someone you’d like to learn from."}</p>
            </div>
            <Button variant="primary" icon={store.contacts.length ? "event_available" : "person_add"} onClick={() => go(store.contacts.length ? "schedule" : "add-contact")}>
              {store.contacts.length ? "Schedule Event" : "Add your first contact"}
            </Button>
          </div>
        )}
      </Card>

      {unlogged.length > 0 && (
        <Card className="p-4 md:p-5 flex flex-col gap-3 border-brand-2/40">
          <p className="label-caps text-brand">How did it go?</p>
          {unlogged.slice(0, 3).map((e) => {
            const c = store.contactById(e.contactId);
            if (!c) return null;
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-3">
                <Avatar name={c.name} size={36} />
                <p className="flex-1 min-w-[180px]"><b>{c.name}</b> <span className="text-fg-2">· {relativeDay(e.start)} at {formatTime(e.start)}</span></p>
                <Button size="sm" variant="primary" icon="edit_note" onClick={() => openLog({ eventId: e.id })}>Log debrief</Button>
              </div>
            );
          })}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard icon="contacts" badge={`${store.contacts.length} contact${store.contacts.length === 1 ? "" : "s"} saved`} title="Contact Directory & Notes"
          text="Manage your professional network."
          cta="Go to Contacts" onClick={() => go("contacts")} />
        <ModuleCard icon="calendar_month" badge={next ? `Next chat: ${relativeDay(next.start)}` : "Nothing scheduled"} title="Calendar & Meeting Schedules"
          text="Keep track of coffee chats, thank you notes, and follow-ups."
          cta="Go to Calendar" onClick={() => go("calendar")} />
      </div>
      </div>

      <DraftModal eventId={draftId} onClose={() => setDraftId(null)} />
    </div>
  );
}

// ---------- Phone: "Up next" ----------
type UpNextItem =
  | { type: "debrief"; e: ChatEvent; c: Contact; rank: number }
  | { type: "chat"; e: ChatEvent; c: Contact; rank: number }
  | { type: "task"; e: ChatEvent; c: Contact; rank: number; overdue: boolean };

/** One list of things to do, most urgent first: unlogged chats, overdue notes, then everything else by time. */
function buildUpNext(events: ChatEvent[], contactById: (id: string) => Contact | undefined, now: Date): UpNextItem[] {
  const out: UpNextItem[] = [];
  const debriefs = needsDebrief(events, now);
  const debriefIds = new Set(debriefs.map((e) => e.id));
  for (const e of [...debriefs].reverse()) { const c = contactById(e.contactId); if (c) out.push({ type: "debrief", e, c, rank: 0 }); }
  for (const e of dueTasks(events, 7, now)) {
    const c = contactById(e.contactId); const overdue = isOverdue(e, now);
    if (c) out.push({ type: "task", e, c, rank: overdue ? 1 : 2, overdue });
  }
  for (const e of upcomingChats(events, now)) {
    const c = contactById(e.contactId);
    if (c && !debriefIds.has(e.id)) out.push({ type: "chat", e, c, rank: 2 });
  }
  return out.sort((a, b) => a.rank - b.rank || (a.rank === 0 ? 0 : a.e.start.localeCompare(b.e.start)));
}

// Short day for narrow rows: "Today", "Tomorrow", "Yesterday", otherwise "Sun, Nov 15".
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
function shortRelDay(start: string) {
  const r = relativeDay(start);
  return r === "Today" || r === "Tomorrow" || r === "Yesterday" ? r : shortDay.format(parseLocal(start));
}

function upNextText(it: UpNextItem): { context: string; action: string; icon: string; urgent: boolean } {
  const day = shortRelDay(it.e.start);
  if (it.type === "debrief") return { context: `How did it go? · ${day}`, action: "Debrief", icon: "edit_note", urgent: true };
  if (it.type === "chat") return { context: `Coffee chat · ${day} ${formatTime(it.e.start)}`, action: "Prep", icon: "auto_awesome", urgent: false };
  const what = it.e.kind === "thankyou" ? "Thank-you note" : "Follow-up";
  return { context: it.overdue ? `${what} · Overdue` : `${what} due · ${day}`, action: "Write", icon: "edit", urgent: it.overdue };
}

function UpNext({ items, hasContacts, onAct, onSeeAll, onEmpty }:
  { items: UpNextItem[]; hasContacts: boolean; onAct: (it: UpNextItem) => void; onSeeAll: () => void; onEmpty: () => void }) {
  if (!items.length) {
    return (
      <Card className="px-4 py-3 flex items-center gap-3">
        <p className="flex-1 min-w-0 text-[14px] text-fg-2">{hasContacts ? "Nothing coming up. Who’s next?" : "Add someone you’d like to stay in touch with."}</p>
        <Button size="sm" variant="primary" icon={hasContacts ? "event_available" : "person_add"} onClick={onEmpty}>{hasContacts ? "Schedule a chat" : "Add contact"}</Button>
      </Card>
    );
  }
  return (
    <section aria-labelledby="up-next" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="up-next" className="label-caps text-brand">Up next</h2>
        <button type="button" onClick={onSeeAll} className="text-[13px] font-semibold text-fg-2 hover:text-fg inline-flex items-center gap-0.5">See all in Calendar<Icon name="chevron_right" className="text-[18px]" /></button>
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {items.slice(0, 4).map((it) => {
          const t = upNextText(it);
          return (
            <div key={it.type + it.e.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={it.c.name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold leading-tight truncate">{it.c.name}</p>
                <p className={cx("text-[13px] truncate mt-0.5", t.urgent ? "text-brand font-semibold" : "text-fg-2")}>{t.context}</p>
              </div>
              <Button size="sm" variant={it.type === "debrief" ? "primary" : "secondary"} icon={t.icon} onClick={() => onAct(it)} className="shrink-0 px-2.5">{t.action}</Button>
            </div>
          );
        })}
      </Card>
    </section>
  );
}

// ---------- Phone: quick actions + people to reconnect with ----------
function QuickActions({ onAdd, onSchedule, onLog }: { onAdd: () => void; onSchedule: () => void; onLog: () => void }) {
  const items = [
    { icon: "person_add", label: "Add contact", on: onAdd },
    { icon: "event_available", label: "Schedule", on: onSchedule },
    { icon: "edit_note", label: "Log a chat", on: onLog },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((a) => (
        <button key={a.label} type="button" onClick={a.on}
          className="rounded-2xl bg-card border border-line shadow-soft py-3 flex flex-col items-center gap-1.5 text-[12px] font-semibold text-fg-2 active:bg-card-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-peach text-on-peach"><Icon name={a.icon} className="text-[20px]" /></span>{a.label}
        </button>
      ))}
    </div>
  );
}

/** People you haven't been in touch with for a while (or ever), longest gap first. */
function Reconnect({ contacts, events, busyIds, onOpen, onAll }:
  { contacts: Contact[]; events: ChatEvent[]; busyIds: Set<string>; onOpen: (id: string) => void; onAll: () => void }) {
  const DAY = 86400000, now = Date.now();
  const rows = contacts
    .filter((c) => !busyIds.has(c.id))
    .map((c) => { const last = lastContactOf(c, events); return { c, last, gap: last ? (now - new Date(last).getTime()) / DAY : Infinity }; })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);
  if (!rows.length) return null;
  return (
    <section aria-labelledby="reconnect" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="reconnect" className="label-caps text-brand">Stay in touch</h2>
        <button type="button" onClick={onAll} className="text-[13px] font-semibold text-fg-2 hover:text-fg inline-flex items-center gap-0.5">All contacts<Icon name="chevron_right" className="text-[18px]" /></button>
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {rows.map(({ c, last }) => (
          <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 active:bg-card-2">
            <Avatar name={c.name} size={36} />
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold leading-tight truncate">{c.name}</span>
              <span className="block text-[13px] text-fg-2 truncate mt-0.5">{last ? `Last talked ${fromNow(last)}` : "No chat yet"}{c.company ? ` · ${c.company}` : ""}</span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-brand">Say hi<Icon name="chevron_right" className="text-[18px]" /></span>
          </button>
        ))}
      </Card>
    </section>
  );
}

/** New-account checklist; disappears once every step is done. */
function GettingStarted({ steps }: { steps: { done: boolean; label: string; note?: string; on: () => void }[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section aria-labelledby="getting-started" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="getting-started" className="label-caps text-brand">Get set up</h2>
        <span className="text-[12px] font-semibold text-fg-3 tnum">{done}/{steps.length} done</span>
      </div>
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-sunken"><div className="h-full bg-brand-2 transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        <ul className="divide-y divide-line">
          {steps.map((s) => (
            <li key={s.label}>
              <button type="button" onClick={s.on} disabled={s.done} className="w-full text-left flex items-center gap-3 px-3.5 py-3 active:bg-card-2 disabled:active:bg-transparent">
                <span className={cx("grid place-items-center w-6 h-6 rounded-full shrink-0 border", s.done ? "bg-blue border-blue text-card" : "border-line-2 text-transparent")}>
                  <Icon name="check" className="text-[16px]" />
                </span>
                <span className={cx("flex-1 min-w-0 text-[14px]", s.done ? "text-fg-3 line-through" : "font-semibold")}>{s.label}</span>
                {!s.done && <span className="shrink-0 inline-flex items-center text-fg-3">{s.note && <span className="text-[12px] font-semibold mr-1 tnum">{s.note}</span>}<Icon name="chevron_right" className="text-[20px]" /></span>}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

const TIPS = [
  "Send a thank-you within 24 hours, and mention one specific thing they said.",
  "Before a coffee chat, prepare one question you can't answer with a Google search.",
  "A follow-up 4–6 weeks later with an update on their advice is the easiest way to stay memorable.",
  "End every chat by asking: “Is there anyone else you think I should talk to?”",
  "Share something useful (an article, an event) instead of only asking for help.",
  "Keep it short: a 15-minute chat that ends on time is often remembered better than a long one.",
];
function TipCard({ now }: { now: Date }) {
  const tip = TIPS[Math.floor(now.getTime() / 86400000) % TIPS.length];
  return (
    <Card className="ai-glow px-4 py-3.5 flex gap-3">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-card border border-line text-brand shrink-0"><Icon name="lightbulb" className="text-[20px]" /></span>
      <div className="min-w-0">
        <p className="label-caps text-brand">Networking tip</p>
        <p className="text-[14px] text-fg-2 mt-0.5">{tip}</p>
      </div>
    </Card>
  );
}

function ModuleCard({ icon, badge, title, text, cta, onClick }: { icon: string; badge: string; title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <Card className="p-1.5 bg-card-2">
      <div className="h-full rounded-xl bg-card border border-line px-4 py-3 flex items-center gap-4 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--peach) 60%, transparent), transparent 70%)" }} />
        <span className="relative grid place-items-center w-10 h-10 rounded-xl bg-peach text-on-peach shrink-0"><Icon name={icon} /></span>
        <div className="relative flex-1 min-w-0">
          <h2 className="text-[17px] font-bold tracking-[-0.01em] truncate">{title}</h2>
          <p className="text-fg-2 text-[14px] mt-0.5">{text}</p>
        </div>
        <div className="relative shrink-0 flex flex-col items-end gap-1.5">
          <Chip tone="neutral">{badge}</Chip>
          <button type="button" onClick={onClick} className="text-sm font-bold inline-flex items-center gap-1 hover:text-brand">{cta}<Icon name="arrow_forward" className="text-[18px]" /></button>
        </div>
      </div>
    </Card>
  );
}
