import { useState } from "react";
import { useStore } from "../lib/store";
import { intent, useNav } from "../lib/nav";
import { Button, Card, Chip, Icon, Input, Label, Modal, TextArea, cx, useToast } from "../components/ui";
import { GOAL_HINT, GOAL_LABEL, ROLE_ICON, ROLE_LABEL, type Contact, type Goal, type RoleType } from "../lib/types";
import { todayISO, uid } from "../lib/date";

const ROLES = Object.keys(ROLE_LABEL) as RoleType[];
const GOALS = Object.keys(GOAL_LABEL) as Goal[];

export function ContactForm({ id }: { id?: string }) {
  const store = useStore();
  const { go } = useNav();
  const toast = useToast();
  const existing = id ? store.contactById(id) : undefined;
  const [f, setF] = useState<Contact>(() => existing ?? {
    id: uid("c"), name: "", title: "", company: "", roleTypes: [], school: "", metVia: "event", metAt: "",
    lastContact: todayISO(), goals: ["career_exploration", "advice"], notes: "", linkedin: "", email: "",
    createdAt: "", updatedAt: "",
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (id && !existing) {
    return <Card className="p-8 text-center"><p className="mb-4">This contact no longer exists.</p><Button onClick={() => go("contacts")}>Back to contacts</Button></Card>;
  }

  async function save(withPrep: boolean) {
    if (!f.name.trim()) { toast("Add the contact’s name.", "error"); document.getElementById("cf-name")?.focus(); return; }
    setBusy(true);
    const now = new Date().toISOString();
    const c: Contact = {
      ...f, name: f.name.trim(), title: f.title.trim(), company: f.company.trim(), metAt: f.metAt.trim(),
      school: f.school?.trim() || undefined, linkedin: f.linkedin?.trim() || undefined, email: f.email?.trim() || undefined,
      lastContact: f.lastContact || undefined, createdAt: f.createdAt || now, updatedAt: now,
    };
    try {
      await store.upsertContact(c);
      toast(existing ? "Contact updated" : `${c.name.split(" ")[0]} added to your network`);
      if (withPrep) { intent.generatePrepFor = c.id; intent.tab = "prep"; }
      go("contact", c.id);
    } catch { setBusy(false); }
  }

  async function remove() {
    if (!existing) return;
    await store.deleteContact(existing.id);
    toast(`${existing.name} removed`);
    go("contacts");
  }

  return (
    <div className="flex flex-col gap-6 rise">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {existing && <button type="button" onClick={() => go("contact", existing.id)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-fg-2 hover:text-fg"><Icon name="arrow_back" className="text-[18px]" />Back to {existing.name}</button>}
          <h1 className="font-serif text-[36px] md:text-[44px] font-semibold leading-tight">{existing ? "Edit Contact" : "Add New Contact"}</h1>
          <p className="text-fg-2 text-[17px]">Log connection details before your chat and capture key takeaways after.</p>
        </div>
        <span className="self-start md:self-auto inline-flex items-center gap-2 rounded-full bg-card border border-line px-4 py-2 text-sm font-semibold shadow-soft">
          <span className="w-2.5 h-2.5 rounded-full bg-peach border border-brand-2" />2-Stage Lifecycle Tracker
        </span>
      </div>

      <Card className="p-5 md:p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-ink text-on-ink font-serif text-[22px] font-semibold">01</span>
            <div>
              <p className="text-[12px] font-bold text-fg-3"><Chip tone="peach">MILESTONE 1</Chip> · PREPARATION PHASE</p>
              <h2 className="font-serif text-[24px] font-semibold mt-1">Before Meeting</h2>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="label-caps text-fg-3">Target readiness</p>
            <p className="font-bold text-[18px]">Context & Research</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <div><Label htmlFor="cf-name" hint="Required">Contact name</Label>
              <Input id="cf-name" icon="person" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Tyler Vance" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="cf-title">Role / title</Label><Input id="cf-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Product Manager" /></div>
              <div><Label htmlFor="cf-company">Company</Label><Input id="cf-company" icon="apartment" value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Stripe" /></div>
            </div>
            <div>
              <Label hint="Pick any that apply">Contact role type</Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Contact role type">
                {ROLES.map((r) => {
                  const on = f.roleTypes.includes(r);
                  return (
                    <button key={r} type="button" aria-pressed={on} onClick={() => set("roleTypes", toggle(f.roleTypes, r))}
                      className={cx("inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold border transition",
                        on ? "bg-peach text-on-peach border-brand-2/50" : "bg-sunken text-fg-2 border-transparent hover:border-line-2")}>
                      <Icon name={on ? "check" : ROLE_ICON[r]} className="text-[16px]" />{ROLE_LABEL[r]}
                    </button>
                  );
                })}
              </div>
            </div>
            {f.roleTypes.includes("alumni") && (
              <div><Label htmlFor="cf-school">Shared school</Label><Input id="cf-school" icon="school" value={f.school ?? ""} onChange={(e) => set("school", e.target.value)} placeholder="Rotman ’24" /></div>
            )}
            <div>
              <Label>Meeting context</Label>
              <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Meeting context">
                {([["event", "Met at event", "In-person summits, fairs, conferences", "campaign"], ["online", "Met online", "LinkedIn, cold email, intro", "language"]] as const).map(([v, t, d, ic]) => (
                  <button key={v} type="button" role="radio" aria-checked={f.metVia === v} onClick={() => set("metVia", v)}
                    className={cx("text-left rounded-xl p-4 border transition flex gap-3", f.metVia === v ? "bg-card-2 border-brand-2" : "bg-sunken border-transparent hover:border-line-2")}>
                    <Icon name={f.metVia === v ? "radio_button_checked" : "radio_button_unchecked"} className={cx("text-[20px]", f.metVia === v ? "text-brand" : "text-fg-3")} />
                    <span className="flex-1"><span className="font-semibold flex items-center justify-between">{t}<Icon name={ic} className="text-fg-3 text-[18px]" /></span><span className="block text-[13px] text-fg-3">{d}</span></span>
                  </button>
                ))}
              </div>
              <div className="mt-3"><label htmlFor="cf-metat" className="sr-only">Where you met</label>
                <Input id="cf-metat" icon={f.metVia === "event" ? "account_balance" : "link"} value={f.metAt} onChange={(e) => set("metAt", e.target.value)}
                  placeholder={f.metVia === "event" ? "Rotman Tech Career Expo 2026" : "LinkedIn intro from a classmate"} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="cf-last">Last contact date</Label><Input id="cf-last" type="date" value={f.lastContact ?? ""} onChange={(e) => set("lastContact", e.target.value)} /></div>
              <div><Label htmlFor="cf-email" hint="Optional">Email</Label><Input id="cf-email" type="email" icon="mail" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" /></div>
            </div>
            <div><Label htmlFor="cf-li" hint="Optional">LinkedIn URL</Label><Input id="cf-li" type="url" icon="link" value={f.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/…" /></div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="cf-notes" hint="Personal research">Notes</Label>
              <TextArea id="cf-notes" rows={7} value={f.notes} onChange={(e) => set("notes", e.target.value)}
                placeholder="Background, education, company notes. e.g. Graduated from Waterloo Math in 2020, worked at Shopify before Stripe, wrote a post on API versioning. We’re both into climate tech." />
              <p className="text-[12px] text-fg-3 mt-1.5">The AI prep brief uses these notes, so specifics help.</p>
            </div>
            <div>
              <Label hint="Define conversation intent">Discussion goals</Label>
              <div className="flex flex-col gap-2">
                {GOALS.map((g) => (
                  <label key={g} htmlFor={`cf-goal-${g}`} className={cx("flex gap-3 rounded-xl px-4 py-3 cursor-pointer border transition", f.goals.includes(g) ? "bg-card-2 border-line-2" : "bg-sunken border-transparent")}>
                    <input id={`cf-goal-${g}`} type="checkbox" checked={f.goals.includes(g)} onChange={() => set("goals", toggle(f.goals, g))} className="mt-1 w-4 h-4 accent-[var(--brand-2)]" />
                    <span><span className="block font-semibold">{GOAL_LABEL[g]}</span><span className="block text-[13px] text-fg-3">{GOAL_HINT[g]}</span></span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[13px] text-fg-3 inline-flex items-center gap-1.5"><Icon name="lock" className="text-[16px]" />
          {store.mode === "cloud" ? "Private to you · synced to your NextCup workspace" : "Saved on this device"}</p>
        <div className="flex flex-wrap gap-2">
          {existing && <Button variant="ghost" icon="delete" onClick={() => setConfirmDelete(true)} className="text-danger">Delete</Button>}
          <Button variant="secondary" onClick={() => (existing ? go("contact", existing.id) : go("contacts"))}>Cancel</Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={busy}>Save contact</Button>
          <Button variant="primary" icon="bolt" onClick={() => save(true)} disabled={busy}>Save & Generate AI Prep</Button>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this contact?" labelledBy="del-contact"
        footer={<><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" icon="delete" onClick={remove}>Delete contact</Button></>}>
        <p className="text-fg-2">This removes {existing?.name}, their meeting history, notes and follow-ups. It can’t be undone.</p>
      </Modal>
    </div>
  );
}
