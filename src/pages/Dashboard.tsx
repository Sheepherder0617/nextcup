import { useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Icon, cx } from "../components/ui";
import { DraftModal } from "../components/DraftModal";
import { dueTasks, funnel, inThisWeek, isOverdue, needsDebrief, upcomingChats } from "../lib/derive";
import { formatTime, fromNow, greeting, parseLocal, relativeDay, timeRange } from "../lib/date";
import { FORMAT_LABEL, KIND_ICON } from "../lib/types";
import { eventToIcs, saveFile } from "../lib/files";

export function Dashboard() {
  const store = useStore();
  const { go, openLog, openPrep } = useNav();
  const [draftId, setDraftId] = useState<string | null>(null);
  const now = new Date();
  const first = store.profile?.name.split(" ")[0] ?? "";
  const chats = upcomingChats(store.events, now);
  const next = chats[0];
  const nextContact = next ? store.contactById(next.contactId) : undefined;
  const weekChats = chats.filter((e) => inThisWeek(e, now)).length;
  const tasks = dueTasks(store.events, 7, now);
  const unlogged = needsDebrief(store.events, now);
  const within24 = next ? parseLocal(next.start).getTime() - now.getTime() < 86400000 : false;
  const steps = funnel(store.contacts, store.events);
  const maxStep = Math.max(1, steps[0].value);

  return (
    <div className="flex flex-col gap-6 rise">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] md:text-[44px] leading-tight font-semibold tracking-[-0.015em] flex items-center gap-3">
          {greeting(now)}, {first}! <Icon name="local_cafe" className="text-brand-2 text-[34px] md:text-[40px]" />
        </h1>
        <p className="text-fg-2 text-[17px] max-w-[62ch]">
          You have <b className="text-fg">{weekChats} coffee chat{weekChats === 1 ? "" : "s"}</b> scheduled this week and{" "}
          <b className="text-fg">{tasks.length} follow-up{tasks.length === 1 ? "" : "s"}</b> due in the next 7 days.
        </p>
      </div>

      {/* Next chat */}
      <Card className="p-2 bg-card-2">
        {next && nextContact ? (
          <div className="rounded-xl bg-card border border-line p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
            <span className="hidden sm:grid place-items-center w-12 h-12 rounded-xl bg-peach text-on-peach shrink-0"><Icon name="connect_without_contact" /></span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-2 font-semibold">
                <Chip tone={within24 ? "peach" : "blue"}>{within24 ? "UPCOMING IN 24H" : "NEXT CHAT"}</Chip>
                <span className="tnum">{relativeDay(next.start)} · {timeRange(next.start, next.durationMin)}</span>
                {next.format && <span>· {FORMAT_LABEL[next.format]}</span>}
              </div>
              <h2 className="text-[20px] font-bold mt-1.5">Coffee Chat with {nextContact.name}</h2>
              <p className="text-fg-2 text-[15px]">{[nextContact.title && `${nextContact.title}${nextContact.company ? " at " + nextContact.company : ""}`, next.topic && `Topic: ${next.topic}`].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {next.link && <a href={next.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-ink text-on-ink text-sm font-semibold"><Icon name="videocam" className="text-[18px]" />Join meeting</a>}
              <Button variant="soft" iconRight="arrow_forward" onClick={() => openPrep(nextContact.id, next.id)}>Pre-Meeting Brief</Button>
              <Button variant="ghost" icon="event" onClick={() => saveFile(`coffee-chat-${nextContact.name.split(" ")[0].toLowerCase()}.ics`, eventToIcs(next, nextContact), "text/calendar")} aria-label="Add to my calendar">Add to calendar</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-line p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-peach text-on-peach shrink-0"><Icon name="event_available" /></span>
            <div className="flex-1">
              <h2 className="text-[18px] font-bold">No coffee chats on the calendar</h2>
              <p className="text-fg-2 text-[15px]">{store.contacts.length ? "Pick someone from your contacts and set up the next conversation." : "Start by adding someone you’d like to learn from."}</p>
            </div>
            <Button variant="primary" icon={store.contacts.length ? "event_available" : "person_add"} onClick={() => go(store.contacts.length ? "schedule" : "add-contact")}>
              {store.contacts.length ? "Schedule a chat" : "Add your first contact"}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Follow-ups */}
        <Card className="p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-[26px] font-semibold leading-tight">Follow-up commitments</h2>
              <p className="text-fg-3 text-[13px]">Thank-you notes and check-ins due this week</p>
            </div>
            <Button size="sm" variant="ghost" iconRight="arrow_forward" onClick={() => go("calendar")}>All</Button>
          </div>
          {tasks.length === 0 ? (
            <div className="rounded-xl bg-card-2 border border-dashed border-line-2 p-5 text-center text-fg-2 text-[14px]">
              Nothing due. After your next chat, tap <b>Log a chat</b> and NextCup plans the thank-you and check-in for you.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {tasks.map((t) => {
                const c = store.contactById(t.contactId);
                if (!c) return null;
                const overdue = isOverdue(t, now);
                return (
                  <li key={t.id} className="py-3 flex flex-wrap items-center gap-3">
                    <span className={cx("grid place-items-center w-10 h-10 rounded-xl shrink-0", t.kind === "thankyou" ? "bg-peach text-on-peach" : "bg-blue-soft text-on-blue-soft")}><Icon name={KIND_ICON[t.kind]} /></span>
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-semibold">{t.kind === "thankyou" ? "Send thank-you to " : "Check in with "}<button type="button" className="underline decoration-line-2 underline-offset-2 hover:text-brand" onClick={() => go("contact", c.id)}>{c.name}</button></p>
                      <p className={cx("text-[13px]", overdue ? "text-danger font-semibold" : "text-fg-3")}>{overdue ? `Overdue · was due ${fromNow(t.start)}` : `Due ${fromNow(t.start)}`}{t.draft ? " · draft saved" : ""}</p>
                    </div>
                    <Button size="sm" variant={overdue ? "primary" : "secondary"} icon="edit" onClick={() => setDraftId(t.id)}>{t.draft ? "Open draft" : "Write it"}</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Funnel */}
        <Card className="p-5 md:p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-[26px] font-semibold leading-tight">Network pulse</h2>
            <p className="text-fg-3 text-[13px]">People at each stage of the coffee-chat journey</p>
          </div>
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]"><span className="font-semibold text-fg-2">{s.label}</span><span className="tnum font-bold">{s.value}</span></div>
                <div className="h-2.5 rounded-full bg-sunken overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(s.value ? 4 : 0, (s.value / maxStep) * 100)}%`, background: i === 3 ? "var(--blue)" : "var(--brand-2)", opacity: 1 - i * 0.12 }} />
                </div>
              </li>
            ))}
          </ol>
          {steps[1].value > 0 && <p className="text-[13px] text-fg-2">{Math.round((steps[2].value / Math.max(1, steps[1].value)) * 100)}% of scheduled chats have happened; {Math.round((steps[3].value / Math.max(1, steps[2].value)) * 100)}% of those got a follow-up.</p>}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ModuleCard icon="contacts" badge={`${store.contacts.length} contact${store.contacts.length === 1 ? "" : "s"} saved`} title="Contacts Directory & Notes"
          text="Manage professional connections, alumni mentors and conversation retrospectives in one warm editorial notebook."
          meta={`${store.events.filter((e) => e.kind !== "coffee" && e.status === "planned").length} follow-ups active`} metaIcon="autorenew" cta="Go to Contacts" onClick={() => go("contacts")} />
        <ModuleCard icon="calendar_month" badge={next ? `Next chat: ${relativeDay(next.start)}` : "Nothing scheduled"} title="Calendar & Meeting Schedules"
          text="Coordinate virtual calls and neighbourhood coffee meetups with prep briefs, reminders and scheduled follow-ups."
          meta={`${weekChats} chat${weekChats === 1 ? "" : "s"} scheduled this week`} metaIcon="schedule" cta="Open Calendar" onClick={() => go("calendar")} />
      </div>

      <DraftModal eventId={draftId} onClose={() => setDraftId(null)} />
    </div>
  );
}

function ModuleCard({ icon, badge, title, text, meta, metaIcon, cta, onClick }: { icon: string; badge: string; title: string; text: string; meta: string; metaIcon: string; cta: string; onClick: () => void }) {
  return (
    <Card className="p-2 bg-card-2">
      <div className="h-full rounded-xl bg-card border border-line p-5 md:p-7 flex flex-col gap-3 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--peach) 60%, transparent), transparent 70%)" }} />
        <div className="relative flex items-start justify-between gap-3">
          <span className="grid place-items-center w-12 h-12 rounded-xl bg-peach text-on-peach"><Icon name={icon} /></span>
          <Chip tone="neutral">{badge}</Chip>
        </div>
        <h2 className="relative text-[22px] md:text-[24px] font-bold tracking-[-0.01em] mt-2">{title}</h2>
        <p className="relative text-fg-2">{text}</p>
        <div className="relative mt-auto pt-4 border-t border-line flex items-center justify-between gap-3">
          <span className="text-[13px] text-fg-3 inline-flex items-center gap-1.5"><Icon name={metaIcon} className="text-[16px]" />{meta}</span>
          <button type="button" onClick={onClick} className="text-sm font-bold inline-flex items-center gap-1 hover:text-brand">{cta}<Icon name="arrow_forward" className="text-[18px]" /></button>
        </div>
      </div>
    </Card>
  );
}
