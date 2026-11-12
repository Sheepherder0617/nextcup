import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Icon } from "../components/ui";
import { dueTasks, inThisWeek, needsDebrief, upcomingChats } from "../lib/derive";
import { formatTime, greeting, parseLocal, relativeDay, timeRange } from "../lib/date";
import { FORMAT_LABEL } from "../lib/types";
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
  const stats = [
    { label: "Total contacts", value: `${store.contacts.length} Contacts`, icon: "group" },
    { label: "Completed chats", value: `${store.events.filter((e) => e.kind === "coffee" && e.status === "done").length} Logged`, icon: "local_cafe" },
    { label: "Upcoming chats", value: `${chats.length} Scheduled`, icon: "calendar_month" },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-5 rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[28px] md:text-[34px] leading-tight font-semibold tracking-[-0.015em] flex items-center gap-3">
          {greeting(now)}, {first}! <Icon name="local_cafe" className="text-brand-2 text-[22px] md:text-[24px]" />
        </h1>
        <p className="text-fg-2 text-[15px] max-w-[62ch]">
          You have <b className="text-fg">{weekChats} coffee chat{weekChats === 1 ? "" : "s"}</b> scheduled this week and{" "}
          <b className="text-fg">{tasks.length} follow-up{tasks.length === 1 ? "" : "s"}</b> due in the next 7 days.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="label-caps text-fg-3">{s.label}</p>
              <p className="font-serif text-[20px] md:text-[22px] font-semibold mt-0.5 tnum">{s.value}</p>
            </div>
            <span className="grid place-items-center w-9 h-9 rounded-lg shrink-0 bg-peach text-on-peach"><Icon name={s.icon} className="text-[20px]" /></span>
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

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <ModuleCard icon="contacts" badge={`${store.contacts.length} contact${store.contacts.length === 1 ? "" : "s"} saved`} title="Contact Directory & Notes"
          text="Manage your professional network."
          cta="Go to Contacts" onClick={() => go("contacts")} />
        <ModuleCard icon="calendar_month" badge={next ? `Next chat: ${relativeDay(next.start)}` : "Nothing scheduled"} title="Calendar & Meeting Schedules"
          text="Keep track of coffee chats, thank you notes, and follow-ups."
          cta="Go to Calendar" onClick={() => go("calendar")} />
      </div>

    </div>
  );
}

function ModuleCard({ icon, badge, title, text, cta, onClick }: { icon: string; badge: string; title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <Card className="p-1.5 bg-card-2">
      <div className="h-full rounded-xl bg-card border border-line px-4 py-3 flex items-center gap-4 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--peach) 60%, transparent), transparent 70%)" }} />
        <span className="relative grid place-items-center w-10 h-10 rounded-xl bg-peach text-on-peach shrink-0"><Icon name={icon} /></span>
        <div className="relative flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
            <Chip tone="neutral">{badge}</Chip>
          </div>
          <p className="text-fg-2 text-[14px] mt-0.5">{text}</p>
        </div>
        <button type="button" onClick={onClick} className="relative shrink-0 text-sm font-bold inline-flex items-center gap-1 hover:text-brand">{cta}<Icon name="arrow_forward" className="text-[18px]" /></button>
      </div>
    </Card>
  );
}
