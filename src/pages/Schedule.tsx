import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { intent, useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Empty, Icon, Input, Label, Segmented, Select, TextArea, Toggle, cx, useToast } from "../components/ui";
import { aiAvailable } from "../lib/ai";
import { addDays, parseLocal, timezoneLabel, todayISO, uid } from "../lib/date";
import { FORMAT_ICON, FORMAT_LABEL, type ChatEvent, type Format } from "../lib/types";
import { eventToIcs, saveFile } from "../lib/files";

const SLOTS = Array.from({ length: 29 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  const v = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60));
  return { v, label };
});
const FORMAT_HINT: Record<Format, string> = { video: "Google Meet / Zoom / Teams", inperson: "Café or campus spot", phone: "Direct dial call" };

function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
}

export function Schedule({ contactId }: { contactId?: string }) {
  const store = useStore();
  const { go } = useNav();
  const toast = useToast();
  const [cid, setCid] = useState(contactId ?? "");
  const [picking, setPicking] = useState(!contactId);
  const [q, setQ] = useState("");
  const [eventType, setEventType] = useState<"coffee" | "followup">("coffee");
  const [format, setFormat] = useState<Format>("video");
  const [link, setLink] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(todayISO(addDays(new Date(), 2)));
  const [time, setTime] = useState("10:30");
  const [duration, setDuration] = useState(store.profile?.durationMin ?? 30);
  const [title, setTitle] = useState("");
  const [followUpDetails, setFollowUpDetails] = useState("");
  const [followUpMonths, setFollowUpMonths] = useState(0);
  const [prep, setPrep] = useState(true);
  const [aiOk, setAiOk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { aiAvailable().then(setAiOk); }, []);

  const c = store.contactById(cid);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return store.contacts.filter((x) => !n || `${x.name} ${x.company} ${x.title}`.toLowerCase().includes(n)).sort((a, b) => a.name.localeCompare(b.name));
  }, [store.contacts, q]);

  if (store.contacts.length === 0) {
    return (
      <Card><Empty icon="person_add" title="Add a contact first" action={<Button variant="primary" icon="person_add" onClick={() => go("add-contact")}>Add a contact</Button>}>
        Choose a contact for your coffee chat or follow-up.
      </Empty></Card>
    );
  }

  const step = !c ? 1 : 2;

  async function submit() {
    if (!c) { toast("Choose who you’re meeting.", "error"); return; }
    if (!date) { toast("Pick a date.", "error"); return; }
    if (!title.trim()) { toast("Add an event title.", "error"); return; }
    if (eventType === "followup" && !followUpDetails.trim()) { toast("Add details for this follow-up.", "error"); return; }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (eventType === "coffee") {
        const ev: ChatEvent = {
          id: uid("e"), contactId: c.id, kind: "coffee", start: `${date}T${time}`, durationMin: duration, format,
          link: format === "video" && link.trim() ? link.trim() : undefined,
          location: format === "inperson" ? place.trim() || undefined : format === "phone" ? place.trim() || undefined : undefined,
          title: title.trim(), status: "planned", createdAt: now,
        };
        await store.upsertEvent(ev);
        const thankYouDate = addDays(parseLocal(`${date}T09:00`), 1);
        await store.upsertEvent({
          id: uid("e"), contactId: c.id, kind: "thankyou", start: `${todayISO(thankYouDate)}T09:00`,
          durationMin: 15, status: "planned", topic: `Thank-you after: ${title.trim()}`,
          createdAt: now,
        });
        if (followUpMonths > 0) {
          const followUpDate = addMonthsClamped(parseLocal(`${date}T10:00`), followUpMonths);
          await store.upsertEvent({
            id: uid("e"), contactId: c.id, kind: "followup", start: `${todayISO(followUpDate)}T10:00`,
            durationMin: 15, status: "planned", topic: `Follow up: ${title.trim()}`,
            createdAt: now,
          });
        }
        toast(`Chat with ${c.name.split(" ")[0]} scheduled · thank-you in 1 day${followUpMonths ? ` · follow-up in ${followUpMonths} months` : ""}`);
      } else {
        const ev: ChatEvent = {
          id: uid("e"), contactId: c.id, kind: "followup", start: `${date}T${time}`, durationMin: 15,
          title: title.trim(), topic: followUpDetails.trim(), status: "planned", createdAt: now,
        };
        await store.upsertEvent(ev);
        toast(`Follow-up with ${c.name.split(" ")[0]} scheduled`);
      }
      const shouldGeneratePrep = eventType === "coffee" && prep && aiOk;
      intent.generatePrepFor = shouldGeneratePrep ? c.id : undefined;
      intent.tab = shouldGeneratePrep ? "prep" : undefined;
      go("calendar");
    } catch { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5 rise">
      <div className="flex flex-col gap-2">
        <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-peach text-on-peach px-3 py-1 text-[11px] font-bold tracking-[0.06em]"><Icon name="event_available" className="text-[15px]" />SCHEDULE EVENT</span>
        <h1 className="font-serif text-[28px] md:text-[34px] font-semibold leading-tight">Schedule Event</h1>
        <p className="text-fg-2 text-[15px] max-w-[62ch]">Schedule a coffee chat or plan a follow-up with a contact.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Card className="p-4 md:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="label-caps text-fg-2 flex items-center gap-2"><Icon name="person_search" className="text-[18px]" />Select contact</p>
              <button type="button" onClick={() => go("add-contact")} className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1.5 text-[12px] font-bold text-fg-2 hover:bg-card-2"><Icon name="add" className="text-[16px]" />Create New Contact</button>
            </div>
            {c && !picking ? (
              <div className="rounded-xl border border-line bg-card-2 p-4 flex items-center gap-4">
                <Avatar name={c.name} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-bold">{c.name}</div>
                  <p className="text-[14px] text-fg-2 truncate">{[c.title, c.company].filter(Boolean).join(" at ")}</p>
                </div>
                <Button variant="ghost" icon="swap_horiz" aria-label="Change contact" onClick={() => setPicking(true)} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input icon="search" aria-label="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your contacts…" />
                <ul className="max-h-72 overflow-y-auto scroll-thin flex flex-col gap-1 rounded-xl border border-line p-1.5">
                  {filtered.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => { setCid(x.id); setPicking(false); }} className={cx("w-full flex items-center gap-3 rounded-lg p-2.5 text-left hover:bg-card-2", x.id === cid && "bg-card-2")}>
                        <Avatar name={x.name} size={36} />
                        <span className="min-w-0"><span className="block font-semibold">{x.name}</span><span className="block text-[13px] text-fg-3 truncate">{[x.title, x.company].filter(Boolean).join(" at ") || "—"}</span></span>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="p-3 text-[14px] text-fg-3">No one matches “{q}”.</li>}
                </ul>
              </div>
            )}
          </Card>

          <Card className={cx("p-4 md:p-5 flex flex-col gap-5", step < 2 && "opacity-60")}>
            <div>
              <Label>Event type</Label>
              <Segmented label="Event type" value={eventType} onChange={setEventType} options={[
                { value: "coffee", label: "Coffee chat" },
                { value: "followup", label: "Follow-up" },
              ]} />
            </div>
            {eventType === "coffee" ? <>
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-bold flex items-center gap-2"><Icon name="video_chat" />Format & Location</h2>
                <span className="label-caps text-fg-3">Step {step} of 2</span>
              </div>
            <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Format">
              {(["video", "inperson", "phone"] as Format[]).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}
                  className={cx("text-left rounded-xl p-4 border transition flex flex-col gap-2 min-h-[110px]", format === f ? "bg-ink text-on-ink border-transparent shadow-lift" : "bg-card border-line hover:bg-card-2")}>
                  <span className="flex justify-between"><Icon name={FORMAT_ICON[f]} className="text-[24px]" /><Icon name={format === f ? "check_circle" : "radio_button_unchecked"} className="text-[20px] opacity-80" /></span>
                  <span className="font-semibold">{FORMAT_LABEL[f]}</span>
                  <span className={cx("text-[13px]", format === f ? "opacity-80" : "text-fg-3")}>{FORMAT_HINT[f]}</span>
                </button>
              ))}
            </div>
            {format === "video" && (
              <div className="rounded-xl bg-card-2 border border-line p-4 flex flex-col gap-3">
                <Label htmlFor="sc-link" hint="Paste your Google Meet, Zoom, or Teams link">Meeting link</Label>
                <Input id="sc-link" type="url" icon="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" />
              </div>
            )}
            {format !== "video" && (
              <div><Label htmlFor="sc-place" hint="Optional">{format === "inperson" ? "Where" : "Phone number"}</Label>
                <Input id="sc-place" icon={format === "inperson" ? "local_cafe" : "call"} value={place} onChange={(e) => setPlace(e.target.value)} placeholder={format === "inperson" ? "Pilot Coffee, Rotman café…" : "(416) 555-0123"} /></div>
            )}
            </> : <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold flex items-center gap-2"><Icon name="autorenew" />Follow-up details</h2>
              <span className="label-caps text-fg-3">Step {step} of 2</span>
            </div>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="sc-date">Date</Label><Input id="sc-date" type="date" icon="calendar_today" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label htmlFor="sc-time" hint={`${duration} mins`}>Time slot</Label>
                <Select id="sc-time" value={time} onChange={(e) => setTime(e.target.value)}>{SLOTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></div>
            </div>
            {eventType === "coffee" && <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented label="Duration" value={duration} onChange={setDuration} options={[15, 30, 45, 60].map((m) => ({ value: m, label: `${m}m` }))} />
              <span className="text-[13px] text-fg-3 inline-flex items-center gap-1.5"><Icon name="public" className="text-[16px]" />{timezoneLabel()}</span>
            </div>}
            <div><Label htmlFor="sc-title" hint="Required">{eventType === "coffee" ? "Title" : "Follow-up title"}</Label>
              <Input id="sc-title" icon="psychology" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={eventType === "coffee" ? "Career paths into fintech product" : "Check in about the role"} required /></div>
            {eventType === "coffee" ? <div>
              <Label htmlFor="sc-follow-up" hint="Adds a future event to your calendar">Follow-up interval</Label>
              <Select id="sc-follow-up" value={followUpMonths} onChange={(e) => setFollowUpMonths(Number(e.target.value))}>
                <option value={0}>No follow-up</option>
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </Select>
            </div> : <div>
              <Label htmlFor="sc-follow-up-details" hint="Required">What should you follow up about?</Label>
              <TextArea id="sc-follow-up-details" value={followUpDetails} onChange={(e) => setFollowUpDetails(e.target.value)} rows={3}
                placeholder="Add context for this follow-up so you know what to discuss or send." required />
            </div>}
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {eventType === "coffee" ? <>
          <Card className="p-4 md:p-5 flex flex-col gap-4 ai-glow">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[20px] font-bold flex items-center gap-2"><Icon name="neurology" />AI Prep Brief</h2>
              <Chip tone={aiOk ? "peach" : "neutral"}>{aiOk ? "Automatic" : "Unavailable"}</Chip>
            </div>
            <p className="text-[14px] text-fg-2">
              {aiOk ? <>When you schedule, the assistant drafts a brief for {c ? c.name.split(" ")[0] : "your contact"}: an opener, tailored questions, common ground and an agenda for {duration} minutes.</>
                : <>AI isn’t connected in this view, so no brief will be generated. You can still schedule and add notes.</>}
            </p>
            <ul className="rounded-xl bg-card border border-line p-3 flex flex-col gap-2 text-[13px]">
              {[["Prep brief", aiOk && prep ? "Right after scheduling" : "Off"], ["Calendar invite", ".ics with reminders"], ["Follow-up drafts", "Planned after you log the chat"]].map(([a, b]) => (
                <li key={a} className="flex justify-between gap-3"><span className="inline-flex items-center gap-2 font-semibold"><Icon name="check_circle" className="text-[16px] text-blue" />{a}</span><span className="text-fg-2 text-right">{b}</span></li>
              ))}
            </ul>
            {aiOk && <Toggle id="sc-prep" checked={prep} onChange={setPrep} label="Generate prep brief" hint="Uses your profile and notes on this contact" icon="bolt" />}
          </Card>
          {c && (
            <Button variant="ghost" icon="event" onClick={() => saveFile(`coffee-chat-${c.name.split(" ")[0].toLowerCase()}.ics`,
              eventToIcs({ id: "preview", contactId: c.id, kind: "coffee", start: `${date}T${time}`, durationMin: duration, format, link, location: place, title, status: "planned", createdAt: "" }, c), "text/calendar")}>
              Download calendar invite (.ics)
            </Button>
          )}
          </> : <Card className="p-4 md:p-5 flex flex-col gap-3">
            <h2 className="text-[20px] font-bold flex items-center gap-2"><Icon name="autorenew" />Follow-up reminder</h2>
            <p className="text-[14px] text-fg-2">This will add a planned follow-up for {c?.name ?? "your contact"} to the Calendar. You can draft a message when it’s time.</p>
          </Card>}
        </aside>
      </div>

      <div className="sticky z-30 -mx-4 md:mx-0 bottom-[calc(72px+env(safe-area-inset-bottom,0px))] md:bottom-4 gutter md:px-5 py-3 bg-header/95 backdrop-blur border-y md:border border-line md:rounded-2xl shadow-lift flex flex-wrap items-center justify-between gap-3">
        <span className="hidden sm:inline-flex items-center gap-2 text-[13px] text-fg-3"><Icon name="verified_user" className="text-[18px]" />Private to you · reminders via your own calendar</span>
        <div className="flex gap-2 ml-auto w-full sm:w-auto">
          <Button variant="secondary" onClick={() => go("calendar")}>Discard</Button>
          <Button variant="primary" icon="event_available" onClick={submit} className="flex-1 sm:flex-none" disabled={busy || !c || !title.trim() || (eventType === "followup" && !followUpDetails.trim())}>
            {aiOk && prep && eventType === "coffee" ? <><span className="sm:hidden">Schedule + AI Prep</span><span className="hidden sm:inline">Schedule Event & Activate AI Prep</span></> : "Schedule Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
