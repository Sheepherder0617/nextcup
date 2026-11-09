import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Chip, Icon, Input, Label, Modal, Segmented, Select, TextArea, Thinking, cx, useToast } from "../components/ui";
import { aiAvailable, aiErrorText, extractSkills, refinePitch } from "../lib/ai";
import { timezoneLabel } from "../lib/date";
import { saveFile } from "../lib/files";
import { upcomingChats } from "../lib/derive";
import { TONE_LABEL, type Profile, type Tone } from "../lib/types";

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
        {([["overview", "Overview & Goals"], ["resume", "Resume & Background"], ["ai", "AI Assistant Preferences"], ["privacy", "Privacy & Data"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx("h-10 px-4 rounded-lg text-sm font-semibold whitespace-nowrap border mb-2", tab === k ? "bg-ink text-on-ink border-transparent" : "bg-card border-line text-fg-2 hover:bg-card-2")}>{l}</button>
        ))}
      </div>

      {tab === "overview" && <Overview p={p} save={save} />}
      {tab === "resume" && <Resume p={p} save={save} />}
      {tab === "ai" && <AiPrefs p={p} save={save} />}
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

const PITCH_LEN = { s30: "30 sec", s60: "1 min", s120: "2 min" } as const;
const PITCH_USE = { s30: "Career fairs, elevator moments, the first line of a chat", s60: "Opening a coffee chat or info session", s120: "Interviews and longer chats where they ask “tell me about yourself”" } as const;

function Overview({ p, save }: { p: Profile; save: (x: Partial<Profile>) => Promise<void> }) {
  const store = useStore();
  const toast = useToast();
  const [len, setLen] = useState<keyof typeof PITCH_LEN>("s30");
  const [text, setText] = useState(p.pitches[len]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [aiOk, setAiOk] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => { aiAvailable().then(setAiOk); return () => ctl.current?.abort(); }, []);
  useEffect(() => { setText(p.pitches[len]); setErr(""); }, [len]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const secs = Math.round(words / 2.4);
  const dirty = text !== p.pitches[len];

  async function refine() {
    ctl.current = new AbortController();
    setBusy(true); setErr("");
    const before = text;
    try {
      const out = await refinePitch({ ...p, pitches: { ...p.pitches, [len]: text } }, len, ctl.current.signal, setText);
      setText(out);
    } catch (e: any) { setText(e?.text ?? before); setErr(aiErrorText(e)); } finally { setBusy(false); }
  }

  const done = store.events.filter((e) => e.kind === "coffee" && e.status === "done").length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-6 min-w-0">
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

        <Card className="p-5 md:p-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-lg bg-sunken text-brand"><Icon name="record_voice_over" /></span>
              <div><h2 className="font-serif text-[26px] font-semibold leading-tight">Self-introductions</h2><p className="text-[13px] text-fg-3">Keep three lengths ready for different moments</p></div>
            </div>
            <Segmented label="Pitch length" value={len} onChange={setLen} options={(Object.keys(PITCH_LEN) as (keyof typeof PITCH_LEN)[]).map((k) => ({ value: k, label: PITCH_LEN[k] }))} />
          </div>
          <p className="text-[13px] text-fg-2 flex items-center gap-1.5"><Icon name="info" className="text-[16px]" />Use it for: {PITCH_USE[len]}</p>
          <div className="rounded-xl bg-card-2 border border-line p-4 flex flex-col gap-3">
            <label htmlFor="pf-pitch" className="sr-only">{PITCH_LEN[len]} pitch</label>
            <textarea id="pf-pitch" rows={len === "s120" ? 9 : len === "s60" ? 6 : 4} value={text} readOnly={busy} onChange={(e) => setText(e.target.value)}
              placeholder="I’m a Master of Management Analytics student at Rotman with a background in statistics…"
              className="w-full bg-transparent font-serif italic text-[18px] leading-relaxed outline-none resize-y" />
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <span className={cx("text-[13px] tnum", secs > { s30: 35, s60: 70, s120: 135 }[len] ? "text-danger font-semibold" : "text-fg-3")}>{words} words · about {secs} sec spoken</span>
              <div className="flex gap-2">
                {busy && <Thinking label="Refining" />}
                {aiOk && !busy && <Button size="sm" variant="ai" icon="auto_awesome" onClick={refine}>{text.trim() ? "Refine with AI" : "Draft with AI"}</Button>}
                <Button size="sm" variant="primary" icon="check" disabled={!dirty || busy} onClick={async () => { await save({ pitches: { ...p.pitches, [len]: text } }); toast("Pitch saved"); }}>Save</Button>
              </div>
            </div>
            {err && <p className="text-[13px] text-danger">{err}</p>}
          </div>
        </Card>
      </div>

      <Card className="p-5 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 className="font-serif text-[24px] font-semibold">Network Pulse</h2><span className="text-[12px] text-fg-3">Updated live</span></div>
        <div className="grid grid-cols-3 gap-2">
          {[[store.contacts.length, "Contacts"], [upcomingChats(store.events).length, "Upcoming chats"], [done, "Chats done"]].map(([n, l]) => (
            <div key={l as string} className="rounded-xl bg-card-2 border border-line p-3 text-center">
              <p className="font-serif text-[30px] font-semibold tnum leading-none">{n}</p>
              <p className="text-[12px] font-semibold text-fg-2 mt-1.5">{l}</p>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-fg-2">A steady rhythm beats a burst: two chats a week through recruiting season adds up to 30+ conversations.</p>
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
    if (!/\.(txt|md)$/i.test(f.name) && !f.type.startsWith("text/")) { toast("Upload a .txt file, or paste your resume text.", "error"); return; }
    setText((await f.text()).slice(0, 20000));
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
        <Label htmlFor="pf-resume" hint={<label className="text-brand font-semibold cursor-pointer inline-flex items-center gap-1"><Icon name="upload_file" className="text-[16px]" />Upload .txt<input type="file" accept=".txt,.md,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /></label>}>Resume text</Label>
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

function AiPrefs({ p, save }: { p: Profile; save: (x: Partial<Profile>) => Promise<void> }) {
  return (
    <Card className="p-5 md:p-7 flex flex-col gap-6 max-w-3xl">
      <div className="flex gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-lg bg-sunken text-brand"><Icon name="tune" /></span>
        <div><h2 className="font-serif text-[26px] font-semibold leading-tight">NextCup AI Preferences</h2><p className="text-[13px] text-fg-3">Briefing tone and follow-up rhythm</p></div>
      </div>
      <div>
        <p className="label-caps text-fg-3 mb-2">Outreach voice & pitch tone</p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tone">
          {(Object.keys(TONE_LABEL) as Tone[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={p.tone === t} onClick={() => save({ tone: t })}
              className={cx("flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left border transition", p.tone === t ? "bg-ink text-on-ink border-transparent" : "bg-card-2 border-line hover:bg-card")}>
              <span><span className="block font-semibold">{TONE_LABEL[t].title}</span><span className={cx("block text-[13px]", p.tone === t ? "opacity-80" : "text-fg-3")}>{TONE_LABEL[t].hint}</span></span>
              <Icon name={p.tone === t ? "check_circle" : "radio_button_unchecked"} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Standard duration</p><p className="text-[13px] text-fg-3">Default length for new coffee chats</p></div>
        <Segmented label="Standard duration" value={p.durationMin} onChange={(v) => save({ durationMin: v })} options={[15, 30, 45].map((m) => ({ value: m, label: m === 30 ? "30m (default)" : `${m}m` }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Follow-up check-in</p><p className="text-[13px] text-fg-3">When to plan the check-in after a logged chat</p></div>
        <Segmented label="Follow-up cadence" value={p.followUpWeeks} onChange={(v) => save({ followUpWeeks: v })} options={[2, 3, 4, 6].map((w) => ({ value: w, label: `${w} wks` }))} />
      </div>
      <div className="rounded-xl bg-card-2 border border-line p-4 text-[14px] text-fg-2 flex gap-3">
        <Icon name="lock" className="text-brand" />
        <p>AI only runs when you press an AI button. Your notes for that contact are sent with the request and aren’t used for anything else.</p>
      </div>
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
