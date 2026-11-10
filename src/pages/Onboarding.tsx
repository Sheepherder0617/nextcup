import { useState } from "react";
import { useStore } from "../lib/store";
import { useNav } from "../lib/nav";
import { Avatar, Button, Card, Icon, Input, Label, useToast } from "../components/ui";
import { Wordmark } from "../components/Logo";
import { extractResumeText } from "../lib/resume";
import type { Profile } from "../lib/types";

const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export function Onboarding() {
  const { saveProfile, viewer, mode, profile, auth } = useStore();
  const { go } = useNav();
  const toast = useToast();
  const [name, setName] = useState(profile?.name ?? viewer.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? auth.email ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [school, setSchool] = useState(profile?.school ?? "");
  const [roles, setRoles] = useState(profile?.targetRoles.join(", ") ?? "");
  const [resume, setResume] = useState(profile?.resumeText ?? "");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [readingResume, setReadingResume] = useState(false);
  const [draggingResume, setDraggingResume] = useState(false);
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onResumeFile(file?: File) {
    if (!file) return;
    setResumeError("");
    setReadingResume(true);
    try {
      const text = await extractResumeText(file);
      setResume(text);
      setResumeFileName(file.name);
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      setReadingResume(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast("Add your name to continue.", "error"); return; }
    setBusy(true);
    const p: Profile = {
      name: name.trim(),
      email: email.trim() || undefined,
      headline: headline.trim() || "Student",
      school: school.trim(),
      location: "",
      status: "active",
      cycle: `${new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0)} recruiting cycle`,
      targetRoles: splitList(roles),
      wishlist: [],
      pitches: { s30: "", s60: "", s120: "" },
      resumeText: agree ? resume.trim() || undefined : undefined,
      skills: [],
      tone: "warm",
      durationMin: 30,
      followUpWeeks: 3,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveProfile(p);
      toast(`Welcome to NextCup, ${p.name.split(" ")[0]}`);
      go("dashboard");
    } catch { setBusy(false); }
  }

  return (
    <div className="min-h-full gutter py-8 md:py-14 bg-card">
      <div className="mx-auto max-w-[1180px] grid gap-10 lg:grid-cols-[1fr_minmax(0,560px)] items-start">
        <div className="flex flex-col gap-6 lg:pt-10">
          <a href="#welcome" className="self-start rounded-xl"><Wordmark /></a>
          <span className="self-start inline-flex items-center gap-2 rounded-full bg-peach text-on-peach px-3 py-1 text-[12px] font-bold"><Icon name="coffee" className="text-[16px]" />Intentional mentorship, one chat at a time</span>
          <h1 className="font-serif font-medium text-[44px] md:text-[60px] leading-[1.04] tracking-[-0.02em]">Launch Your Professional Network Over Coffee</h1>
          <p className="text-fg-2 text-[18px] max-w-[44ch]">Prepare smart questions, capture insights, and master follow-ups with AI designed for intentional career conversations.</p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-[560px]">
            {[
              { icon: "auto_awesome", t: "Smart Prompts", d: "AI-powered talking points tailored to every mentor’s profile." },
              { icon: "edit_note", t: "Effortless Tracking", d: "Automated thank-you drafts, follow-up reminders, and key takeaways." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-card-2 border border-line p-4">
                <p className="font-semibold flex items-center gap-2"><Icon name={f.icon} className="text-brand text-[20px]" />{f.t}</p>
                <p className="text-[13px] text-fg-2 mt-1">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="p-5 md:p-8 shadow-lift">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <h2 className="font-serif text-[30px] font-semibold">Get Started in Seconds</h2>
            <div className="flex items-center gap-4 rounded-xl bg-card-2 border border-line p-4">
              <Avatar name={name || "You"} src={viewer.avatarUrl} size={60} />
              <div className="text-[13px] text-fg-2">
                <p className="font-semibold text-fg text-sm">{mode === "cloud" ? "Signed in with your Claude account" : mode === "supabase" ? `Signed in as ${auth.email}` : "Saved on this device"}</p>
                <p>{mode === "cloud" ? "Your contacts and notes are private to you. Nobody else who opens this page can see them." : mode === "supabase" ? "Your contacts and notes are private to your account and sync across your devices." : "Data stays in this browser. Connect a database later to sync across devices."}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="ob-name">Full name</Label><Input id="ob-name" icon="person" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Lin" autoComplete="name" required /></div>
              <div><Label htmlFor="ob-email">Email</Label><Input id="ob-email" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" autoComplete="email" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="ob-headline">Headline</Label><Input id="ob-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="MMA student · Product & Data" /></div>
              <div><Label htmlFor="ob-school">School</Label><Input id="ob-school" icon="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Rotman School of Management" /></div>
            </div>
            <div><Label htmlFor="ob-roles" hint="Comma separated">Target roles</Label><Input id="ob-roles" icon="flag" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Product Analyst, Data Scientist, APM" /></div>
            <div>
              <Label htmlFor="ob-resume" hint="Optional · used for AI prep">Upload resume</Label>
              <label htmlFor="ob-resume" onDragOver={(e) => { e.preventDefault(); setDraggingResume(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDraggingResume(false); }}
                onDrop={(e) => { e.preventDefault(); setDraggingResume(false); void onResumeFile(e.dataTransfer.files[0]); }}
                className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${draggingResume ? "border-brand-2 bg-card-2" : "border-line-2 bg-sunken hover:border-brand-2 hover:bg-card-2"}`}>
                <Icon name="upload_file" className="text-[26px] text-brand" />
                <span className="text-sm font-semibold text-fg">{readingResume ? "Reading resume…" : resumeFileName || "Choose a PDF or drop it here"}</span>
                <span className="text-xs text-fg-3">PDF, TXT, or Markdown · up to 20,000 characters extracted</span>
                <input id="ob-resume" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" className="sr-only"
                  onChange={(e) => { void onResumeFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
              {resumeError && <p role="alert" className="mt-2 text-[13px] text-danger">{resumeError}</p>}
              {resume && <p className="mt-2 text-[13px] text-fg-3">Resume text extracted and ready for your profile.</p>}
            </div>
            <label htmlFor="ob-agree" className="flex gap-3 items-start text-[13px] text-fg-2 cursor-pointer">
              <input id="ob-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--brand-2)]" />
              Let NextCup AI use my background to suggest common-ground questions and draft messages. AI only runs when I ask for it.
            </label>
            <Button type="submit" variant="primary" size="lg" iconRight="arrow_forward" disabled={busy || readingResume} className="w-full">
              {busy ? "Setting up…" : readingResume ? "Reading resume…" : profile ? "Save & Continue" : "Create Profile & Start Connecting"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
