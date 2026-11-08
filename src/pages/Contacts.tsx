import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Empty, Icon, cx } from "../components/ui";
import { GoalChips, MetLine, RoleChips } from "../components/bits";
import { dueTasks, lastContactOf, upcomingChats } from "../lib/derive";
import { formatDate } from "../lib/date";
import type { RoleType } from "../lib/types";

const FILTERS: { key: "all" | RoleType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mentor", label: "Mentors" },
  { key: "alumni", label: "Alumni" },
  { key: "recruiter", label: "Recruiters" },
  { key: "former_manager", label: "Former Managers" },
  { key: "professional", label: "Professionals" },
];
const PAGE = 8;

export function Contacts() {
  const store = useStore();
  const { go } = useNav();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.contacts
      .map((c) => ({ c, last: lastContactOf(c, store.events, store.notes) }))
      .filter(({ c }) => filter === "all" || c.roleTypes.includes(filter))
      .filter(({ c }) => !needle || [c.name, c.company, c.title, c.metAt, c.school, ...c.roleTypes].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => sort === "name" ? a.c.name.localeCompare(b.c.name) : (b.last ?? b.c.createdAt).localeCompare(a.last ?? a.c.createdAt));
  }, [store.contacts, store.events, store.notes, q, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  const stats = [
    { label: "Total chats", value: `${store.events.filter((e) => e.kind === "coffee" && e.status === "done").length} Logged`, icon: "local_cafe" },
    { label: "Active mentors", value: `${store.contacts.filter((c) => c.roleTypes.includes("mentor")).length} Active`, icon: "school" },
    { label: "Upcoming chats", value: `${upcomingChats(store.events).length} Scheduled`, icon: "calendar_month" },
    { label: "Follow-ups due", value: `${dueTasks(store.events, 7).length} Reminders`, icon: "notifications_active", alert: dueTasks(store.events, 7).length > 0 },
  ];

  return (
    <div className="flex flex-col gap-6 rise">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[36px] md:text-[44px] font-semibold leading-tight flex items-center gap-3 flex-wrap">
            Contacts <span className="font-sans text-[13px] font-bold rounded-full bg-card border border-line px-2.5 py-1 tnum">{store.contacts.length} Connections</span>
          </h1>
          <p className="text-fg-2 max-w-[58ch]">Track coffee chats, conversation prompts and upcoming follow-up commitments across your alumni and industry network.</p>
        </div>
        <Button variant="primary" icon="person_add" onClick={() => go("add-contact")} className="self-start md:self-auto">Add New Contact</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="label-caps text-fg-3">{s.label}</p>
              <p className={cx("font-serif text-[22px] md:text-[26px] font-semibold mt-1 tnum", s.alert && "text-danger")}>{s.value}</p>
            </div>
            <span className={cx("grid place-items-center w-9 h-9 rounded-lg shrink-0", s.alert ? "bg-danger-soft text-danger" : "bg-peach text-on-peach")}><Icon name={s.icon} className="text-[20px]" /></span>
          </Card>
        ))}
      </div>

      <Card className="p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3 text-[20px]" />
          <label htmlFor="contact-search" className="sr-only">Search contacts</label>
          <input id="contact-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search by name, company, role or tags…"
            className="w-full h-11 rounded-lg bg-sunken pl-10 pr-3 outline-none focus:ring-2 focus:ring-brand-2" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1" role="group" aria-label="Filter by relationship">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? store.contacts.length : store.contacts.filter((c) => c.roleTypes.includes(f.key as RoleType)).length;
            return (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); setPage(0); }}
                className={cx("h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition",
                  filter === f.key ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>
                {f.label}{f.key === "all" ? ` (${n})` : ""}
              </button>
            );
          })}
        </div>
        <label htmlFor="contact-sort" className="sr-only">Sort</label>
        <select id="contact-sort" value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 rounded-full bg-card border border-line px-3 text-[13px] font-semibold text-fg-2">
          <option value="recent">Recent first</option>
          <option value="name">Name A–Z</option>
        </select>
      </Card>

      {store.contacts.length === 0 ? (
        <Card><Empty icon="group_add" title="Your network starts with one name"
          action={<Button variant="primary" icon="person_add" onClick={() => go("add-contact")}>Add a contact</Button>}>
          Add someone you met at a career fair, an alum from your program, or a manager you want to stay close to.
        </Empty></Card>
      ) : rows.length === 0 ? (
        <Card><Empty icon="search_off" title="No matches">Try a different name or clear the filter.</Empty></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map(({ c, last }) => (
            <li key={c.id}>
              <Card className="p-4 md:p-5 grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center hover:shadow-lift transition">
                <div className="flex gap-4 min-w-0">
                  <Avatar name={c.name} size={52} />
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a href={`#contact-${c.id}`} className="text-[18px] font-bold mr-1 hover:text-brand">{c.name}</a>
                      <RoleChips roles={c.roleTypes} school={c.school} />
                    </div>
                    {(c.title || c.company) && <p className="text-fg-2">{c.title}{c.title && c.company ? " at " : ""}<b className="text-fg">{c.company}</b></p>}
                    <MetLine c={c} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  {c.goals.length > 0 && <>
                    <p className="label-caps text-fg-3">Strategic goals</p>
                    <div className="flex flex-wrap gap-1.5"><GoalChips goals={c.goals} /></div>
                  </>}
                  <p className="text-[13px] text-fg-2">Last contact: <b className="text-fg tnum">{last ? formatDate(last) : "Not yet"}</b></p>
                </div>
                <Button variant="secondary" iconRight="arrow_forward" onClick={() => go("contact", c.id)} className="justify-self-start md:justify-self-end">Open Profile & AI Notes</Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {rows.length > PAGE && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-fg-2">Showing <b>{cur * PAGE + 1}</b> to <b>{Math.min(rows.length, cur * PAGE + PAGE)}</b> of <b>{rows.length}</b> contacts</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" icon="chevron_left" aria-label="Previous page" disabled={cur === 0} onClick={() => setPage(cur - 1)} />
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === cur ? "page" : undefined}
                className={cx("w-8 h-8 rounded-lg text-[13px] font-bold tnum", i === cur ? "bg-ink text-on-ink" : "bg-card border border-line")}>{i + 1}</button>
            ))}
            <Button size="sm" variant="secondary" icon="chevron_right" aria-label="Next page" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}
