import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Empty, Icon, cx } from "../components/ui";
import { GoalChips, MetLine, RoleChips } from "../components/bits";
import { lastContactOf } from "../lib/derive";
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
  const sort = "recent" as "recent" | "name";
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.contacts
      .map((c) => ({ c, last: lastContactOf(c, store.events) }))
      .filter(({ c }) => filter === "all" || c.roleTypes.includes(filter))
      .filter(({ c }) => !needle || [c.name, c.company, c.title, c.metAt, c.school, ...c.roleTypes].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => sort === "name" ? a.c.name.localeCompare(b.c.name) : (b.last ?? b.c.createdAt).localeCompare(a.last ?? a.c.createdAt));
  }, [store.contacts, store.events, store.notes, q, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="flex flex-col gap-4 md:gap-5 rise">
      <div className="flex items-center md:items-end gap-3 justify-between">
        <h1 className="font-serif text-[28px] md:text-[34px] font-semibold leading-tight flex items-center gap-2 md:gap-3 flex-wrap min-w-0">
          Contacts <span className="font-sans text-[12px] md:text-[13px] font-bold rounded-full bg-card border border-line px-2.5 py-1 tnum">{store.contacts.length}<span className="hidden md:inline"> Connections</span></span>
        </h1>
        {/* Phone: compact square button; desktop: regular button */}
        <button type="button" onClick={() => go("add-contact")}
          className="md:hidden shrink-0 w-[68px] h-[64px] rounded-2xl bg-ink text-on-ink shadow-soft flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold leading-tight hover:opacity-90">
          <Icon name="person_add" className="text-[20px]" /><span>Add New</span><span>Contact</span>
        </button>
        <span className="hidden md:block"><Button variant="primary" icon="person_add" onClick={() => go("add-contact")}>Add New Contact</Button></span>
      </div>

      <Card className="p-0 md:p-3 bg-transparent md:bg-card border-0 md:border shadow-none md:shadow-soft flex flex-col lg:flex-row gap-2.5 md:gap-3 lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3 text-[20px]" />
          <label htmlFor="contact-search" className="sr-only">Search contacts</label>
          <input id="contact-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search by name, company, role or tags…"
            className="w-full h-11 rounded-xl md:rounded-lg bg-card md:bg-sunken border border-line md:border-0 pl-10 pr-3 outline-none focus:ring-2 focus:ring-brand-2" />
        </div>
        <div className="contact-filter-scroll flex gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1" role="group" aria-label="Filter by relationship">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? store.contacts.length : store.contacts.filter((c) => c.roleTypes.includes(f.key as RoleType)).length;
            return (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); setPage(0); }}
                className={cx("h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition",
                  filter === f.key ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>
                {f.label} ({n})
              </button>
            );
          })}
        </div>
      </Card>

      {store.contacts.length === 0 ? (
        <Card><Empty icon="group_add" title="Your network starts with one name"
          action={<Button variant="primary" icon="person_add" onClick={() => go("add-contact")}>Add a contact</Button>}>
          Add someone you met at a career fair, an alum from your program, or a manager you want to stay close to.
        </Empty></Card>
      ) : rows.length === 0 ? (
        <Card><Empty icon="search_off" title="No matches">Try a different name or clear the filter.</Empty></Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map(({ c, last }) => (
            <li key={c.id}>
              {/* Phone: one tappable row */}
              <button type="button" onClick={() => go("contact", c.id)} className="md:hidden w-full text-left rounded-2xl bg-card border border-line shadow-soft px-3.5 py-3 flex items-center gap-3 active:bg-card-2">
                <Avatar name={c.name} size={40} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 min-w-0"><span className="text-[16px] font-bold truncate">{c.name}</span><span className="shrink-0 flex gap-1"><RoleChips roles={c.roleTypes.slice(0, 1)} /></span></span>
                  {(c.title || c.company) && <span className="block text-[13px] text-fg-2 truncate">{c.title}{c.title && c.company ? " · " : ""}{c.company}</span>}
                  <span className="block text-[12px] text-fg-3 mt-0.5">Last contact: {last ? formatDate(last) : "not yet"}</span>
                </span>
                <Icon name="chevron_right" className="text-[22px] text-fg-3" />
              </button>
              <Card className="hidden md:grid px-5 py-3.5 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center hover:shadow-lift transition">
                <div className="flex gap-4 min-w-0">
                  <Avatar name={c.name} size={44} />
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a href={`#contact-${c.id}`} className="text-[17px] font-bold mr-1 hover:text-brand">{c.name}</a>
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
                <Button variant="secondary" iconRight="arrow_forward" onClick={() => go("contact", c.id)} className="contact-profile-button justify-self-start md:justify-self-end">Open Profile & AI Notes</Button>
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
