import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Icon, Input, Label, Modal, Segmented, Select, TextArea, Thinking, cx, useToast } from "../components/ui";
import { aiAvailable, aiErrorText, extractSkills } from "../lib/ai";
import { timezoneLabel } from "../lib/date";
import { saveFile } from "../lib/files";
import { extractResumeText } from "../lib/resume";
import { type Profile } from "../lib/types";

type Tab = "overview" | "resume" | "ai" | "privacy";

export function ProfilePage() {
  const store = useStore();
  const p = store.profile!;
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const save = (patch: Partial<Profile>) => store.saveProfile({ ...p, ...patch });

  return (
    <div className="flex flex-col gap-6 rise">
      <Card className="p-5 md:p-7 flex flex-col md:flex-row gap-5 md:items-center">
        <Avatar name={p.name} src={store.viewer.avatarUrl} size={96} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[34px] md:text-[42px] leading-none font-semibold">{p.name}</h1>
            <Chip tone={p.status === "active" ? "blue" : "neutral"} icon="circle">{p.status === "active" ? "ACTIVE JOB SEARCH" : p.status === "exploring" ? "EXPLORING" : "PAUSED"}{p.cycle ? ` · ${p.cycle.toUpperCase()}` : ""}</Chip>
          </div>
          <p className="text-fg-2 text-[17px]">{[p.headline, p.school].filter(Boolean).join(" · ")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-fg-2">
            {p.location && <span className="inline-flex items-center gap-1.5"><Icon name="location_on" className="text-[17px]" />{p.location}</span>}
            {p.school && <span className="inline-flex items-center gap-1.5"><Icon name="school" className="text-[17px]" />{p.school}</span>}
            <span className="inline-flex items-center gap-1.5"><Icon name="schedule" className="text-[17px]" />{timezoneLabel()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start md:self-center">
          <Button variant="primary" icon="edit" onClick={() => setEditing(true)}>Edit Profile Details</Button>
          {store.auth.enabled && <Button variant="secondary" icon="logout" onClick={() => store.auth.signOut()}>Sign out</Button>}
        </div>
      </Card>

      <div role="tablist" aria-label="Profile sections" className="flex gap-2 overflow-x-auto pb-1 border-b border-line">
        {([["overview", "Overview & Goals"], ["resume", "Resume & Background"], ["privacy", "Appearance"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx("h-10 px-4 rounded-lg text-sm font-semibold whitespace-nowrap border mb-2", tab === k ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>{l}</button>
        ))}
      </div>

      {tab === "overview" && <Overview p={p} save={save} />}
      {tab === "resume" && <Resume p={p} save={save} />}
      {tab === "privacy" && <Privacy />}
      <EditModal open={editing} p={p} onClose={() => setEditing(false)} onSave={async (x) => { await save(x); setEditing(false); }} />
    </div>
  );
}

function ListEditor({ id, label, items, onChange, placeholder, tone = "sand" }: { id: string; label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string; tone?: "sand" | "neutral" }) {
  const [v, setV] = useState("");
  return (
    <div>
      <p className="label-caps text-fg-3 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((x) => (
          <span key={x} className={cx("inline-flex items-center gap-1 rounded-lg pl-3 pr-1.5 py-1.5 text-[14px] font-medium border border-line", tone === "sand" ? "bg-card-2" : "bg-sunken")}>
            {x}<button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(items.filter((y) => y !== x))} className="grid place-items-center w-5 h-5 rounded text-fg-3 hover:text-fg"><Icon name="close" className="text-[15px]" /></button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV(""); }}>
        <label htmlFor={id} className="sr-only">Add to {label}</label>
        <input id={id} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 h-9 rounded-lg bg-sunken px-3 text-[14px] outline-none focus:ring-2 focus:ring-brand-2" />
        <Button type="submit" size="sm" variant="secondary" icon="add" disabled={!v.trim()}>Add</Button>
      </form>
    </div>
  );
}

function Overview({ p, save }: { p: Profile; save: (x: Partial<Profile>) => Promise<void> }) {
  return (
    <div className="w-full">
      <Card className="p-5 md:p-7 flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <span className="grid place-items-center w-10 h-10 rounded-lg bg-sunken text-brand shrink-0"><Icon name="flag" /></span>
            <div><h2 className="font-serif text-[26px] font-semibold leading-tight">Career Goals & Target Roles</h2><p className="text-[13px] text-fg-3">Target roles and wishlist companies feed every AI brief</p></div>
          </div>
          {p.cycle && <Chip tone="peach">{p.cycle}</Chip>}
        </div>
        <ListEditor id="pf-roles" label="Target roles" items={p.targetRoles} onChange={(v) => save({ targetRoles: v })} placeholder="e.g. Product Analyst" />
        <ListEditor id="pf-wish" label="Wishlist companies" items={p.wishlist} onChange={(v) => save({ wishlist: v })} placeholder="e.g. Shopify" tone="neutral" />
      </Card>
    </div>
  );
}

function Resume({ p, save }: { p: Profile; save: (x: Partial<Profile>) => Promise<void> }) {
  const toast = useToast();
  const [text, setText] = useState(p.resumeText ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [aiOk, setAiOk] = useState(false);
  useEffect(() => { aiAvailable().then(setAiOk); }, []);

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      setText(await extractResumeText(f));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not read this file.", "error");
    }
  }
  async function extract() {
    setBusy(true); setErr("");
    try {
      const skills = await extractSkills(text);
      await save({ resumeText: text, skills: Array.from(new Set([...skills])) });
      toast(`${skills.length} skills found`);
    } catch (e) { setErr(aiErrorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5 md:p-7 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-sunken text-brand"><Icon name="description" /></span>
          <div><h2 className="font-serif text-[26px] font-semibold leading-tight">Resume & Extracted Background</h2><p className="text-[13px] text-fg-3">Used to find common ground and write your intros</p></div>
        </div>
        {p.skills.length > 0 && <Chip tone="blue" icon="check_circle">Parsed</Chip>}
      </div>
      <div>
        <Label htmlFor="pf-resume" hint={<label className="text-brand font-semibold cursor-pointer inline-flex items-center gap-1"><Icon name="upload_file" className="text-[16px]" />Upload PDF or text<input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>}>Resume text</Label>
        <TextArea id="pf-resume" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text of your resume: education, experience, projects, skills." />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="secondary" icon="check" disabled={text === (p.resumeText ?? "")} onClick={async () => { await save({ resumeText: text }); toast("Resume saved"); }}>Save text</Button>
        {aiOk && <Button variant="ai" icon="auto_awesome" disabled={busy || !text.trim()} onClick={extract}>Extract skill tags</Button>}
        {busy && <Thinking label="Reading your resume" />}
        {err && <span className="text-danger text-[13px]">{err}</span>}
      </div>
      <ListEditor id="pf-skills" label={`Skill tags · ${p.skills.length} detected`} items={p.skills} onChange={(v) => save({ skills: v })} placeholder="Add a skill, e.g. SQL" tone="neutral" />
    </Card>
  );
}

function Privacy() {
  const store = useStore();
  const { go } = useNav();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [theme, setTheme] = useState<string>(() => { try { return localStorage.getItem("nextcup:theme") ?? "system"; } catch { return "system"; } });
  useEffect(() => {
    const r = document.documentElement;
    if (theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", theme);
    try { localStorage.setItem("nextcup:theme", theme); } catch { /* ignore */ }
  }, [theme]);

  async function exportAll() {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), profile: store.profile, contacts: store.contacts, events: store.events, notes: store.notes }, null, 2);
    const ok = await saveFile(`nextcup-export-${new Date().toISOString().slice(0, 10)}.json`, data, "application/json");
    if (ok) toast("Export ready");
  }
  async function wipe() {
    await store.wipeAll();
    setConfirm(false);
    go(store.auth.enabled ? "signup" : "welcome");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <Card className="p-5 md:p-7 flex flex-col gap-4">
        <h2 className="font-serif text-[26px] font-semibold">Where your data lives</h2>
        <div className="rounded-xl bg-card-2 border border-line p-4 flex gap-3">
          <Icon name={store.mode === "local" ? "smartphone" : "cloud_done"} className="text-brand text-[24px]" />
          <p className="text-[14px] text-fg-2">{store.mode === "cloud"
            ? "Saved privately to your account in this NextCup workspace. Other people who open the same link get their own separate, empty workspace and can’t see yours."
            : store.mode === "supabase"
            ? `Saved to your NextCup account (${store.auth.email}). Only you can read your contacts and notes, and they sync to every device you sign in on.`
            : "Saved in this browser on this device. Clearing your browser data removes it, so export a backup now and then."}</p>
        </div>
        <ul className="text-[14px] text-fg-2 flex flex-col gap-1.5">
          <li><b className="text-fg tnum">{store.contacts.length}</b> contacts · <b className="text-fg tnum">{store.events.length}</b> events · <b className="text-fg tnum">{store.notes.length}</b> notes</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="download" onClick={exportAll}>Export my data (.json)</Button>
          <Button variant="ghost" icon="delete_forever" className="text-danger" onClick={() => setConfirm(true)}>Delete everything</Button>
        </div>
      </Card>
      <Card className="p-5 md:p-7 flex flex-col gap-4">
        <h2 className="font-serif text-[26px] font-semibold">Appearance</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-fg-2">Theme on this device</p>
          <Segmented label="Theme" value={theme} onChange={setTheme} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        </div>
      </Card>
      <Modal open={confirm} onClose={() => setConfirm(false)} labelledBy="wipe-title" title="Delete everything?"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" icon="delete_forever" onClick={wipe}>Delete all my data</Button></>}>
        <p className="text-fg-2">This permanently deletes your profile, {store.contacts.length} contacts, all events and notes. Export first if you want a copy. It can’t be undone.</p>
      </Modal>
    </div>
  );
}

function EditModal({ open, p, onClose, onSave }: { open: boolean; p: Profile; onClose: () => void; onSave: (x: Partial<Profile>) => void }) {
  const [f, setF] = useState(p);
  useEffect(() => { if (open) setF(p); }, [open]);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Edit profile" labelledBy="pf-edit" wide
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="check" disabled={!f.name.trim()} onClick={() => onSave({ ...f, name: f.name.trim() })}>Save profile</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label htmlFor="pe-name">Full name</Label><Input id="pe-name" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label htmlFor="pe-email" hint="Optional">Email</Label><Input id="pe-email" type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="pe-head">Headline</Label><Input id="pe-head" value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="MMA student · Product & Data" /></div>
        <div><Label htmlFor="pe-school">School</Label><Input id="pe-school" value={f.school} onChange={(e) => set("school", e.target.value)} /></div>
        <div><Label htmlFor="pe-loc">Location</Label><Input id="pe-loc" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Toronto, ON" /></div>
        <div><Label htmlFor="pe-status">Search status</Label>
          <Select id="pe-status" value={f.status} onChange={(e) => set("status", e.target.value as Profile["status"])}>
            <option value="active">Active job search</option><option value="exploring">Exploring</option><option value="paused">Paused</option>
          </Select></div>
        <div><Label htmlFor="pe-cycle">Recruiting cycle</Label><Input id="pe-cycle" value={f.cycle} onChange={(e) => set("cycle", e.target.value)} placeholder="2027 summer internships" /></div>
      </div>
    </Modal>
  );
}
