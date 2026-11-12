import { useState } from "react";
import { useStore } from "../lib/store";
import { authErrorText, getSupabase } from "../lib/supabase";
import { Button, Card, Icon, Input, Label, cx } from "../components/ui";
import { Wordmark } from "../components/Logo";

type Mode = "signin" | "signup" | "forgot";

/** Email + password sign-in / sign-up (Supabase). Also handles choosing a new password after a reset link. */
export function AuthPage({ initialMode = "signup" }: { initialMode?: "signin" | "signup" }) {
  const { auth } = useStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice("");
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (mode !== "forgot" && password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    setBusy(true);
    try {
      const sb = await getSupabase();
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data?.session) setNotice("Check your inbox to confirm your email, then sign in.");
      } else if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (auth.recovering) return <NewPassword />;

  return (
    <div className="min-h-full gutter py-8 md:py-14 bg-card">
      <div className="mx-auto max-w-[1080px] grid gap-10 lg:grid-cols-[1fr_minmax(0,460px)] items-start">
        <div className="flex flex-col gap-6 lg:pt-10">
          <a href="#welcome" className="self-start rounded-xl"><Wordmark /></a>
          <h1 className="font-serif font-medium text-[40px] md:text-[54px] leading-[1.05] tracking-[-0.02em]">Your network, one coffee at a time</h1>
          <p className="text-fg-2 text-[18px] max-w-[44ch]">Create a free account to keep your contacts, chat notes and follow-ups in one private place, on your laptop and your phone.</p>
          <ul className="flex flex-col gap-2.5 text-fg-2">
            {[["lock", "Your notes are private to your account"], ["devices", "Same data on every device you sign in on"], ["auto_awesome", "AI prep briefs and thank-you drafts"]].map(([ic, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="grid place-items-center w-9 h-9 rounded-lg bg-peach text-on-peach"><Icon name={ic} className="text-[20px]" /></span>{t}</li>
            ))}
          </ul>
        </div>

        <Card className="p-5 md:p-8 shadow-lift">
          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            {mode !== "forgot" ? (
              <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-xl bg-sunken p-1">
                {([["signup", "Create account"], ["signin", "Sign in"]] as const).map(([m, l]) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(""); setNotice(""); }}
                    className={cx("h-10 rounded-lg text-sm font-semibold transition", mode === m ? "bg-card shadow-soft text-fg" : "text-fg-3 hover:text-fg")}>{l}</button>
                ))}
              </div>
            ) : (
              <div>
                <button type="button" onClick={() => { setMode("signin"); setError(""); setNotice(""); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-2 hover:text-fg"><Icon name="arrow_back" className="text-[18px]" />Back to sign in</button>
                <h2 className="font-serif text-[28px] font-semibold mt-3">Reset your password</h2>
                <p className="text-fg-2 text-sm mt-1">We’ll email you a link to choose a new one.</p>
              </div>
            )}

            <div><Label htmlFor="au-email">Email</Label>
              <Input id="au-email" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" /></div>

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="au-pw" hint={mode === "signin" ? <button type="button" className="text-brand font-semibold" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</button> : "At least 8 characters"}>Password</Label>
                <div className="relative">
                  <Input id="au-pw" icon="key" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-md text-fg-3 hover:text-fg"><Icon name={show ? "visibility_off" : "visibility"} className="text-[20px]" /></button>
                </div>
              </div>
            )}

            {error && <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2.5 flex gap-2"><Icon name="error" className="text-[18px]" />{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-blue-soft text-on-blue-soft text-sm px-3 py-2.5 flex gap-2"><Icon name="mark_email_read" className="text-[18px]" />{notice}</p>}

            <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full" iconRight={mode === "forgot" ? undefined : "arrow_forward"}>
              {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
            </Button>
            <p className="text-[12px] text-fg-3 text-center">By continuing you agree to keep other people’s details you save here private.</p>
          </form>
        </Card>
      </div>
    </div>
  );
}

function NewPassword() {
  const { auth } = useStore();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setError("Use a password with at least 8 characters."); return; }
    setBusy(true); setError("");
    try { await auth.updatePassword(pw); } catch (err) { setError(authErrorText(err)); } finally { setBusy(false); }
  }
  return (
    <div className="min-h-full gutter py-14 bg-card grid place-items-start justify-center">
      <Card className="p-6 md:p-8 shadow-lift w-full max-w-[440px]">
        <form onSubmit={save} className="flex flex-col gap-5">
          <Wordmark />
          <h1 className="font-serif text-[30px] font-semibold">Choose a new password</h1>
          <div><Label htmlFor="np-pw" hint="At least 8 characters">New password</Label>
            <Input id="np-pw" icon="key" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          {error && <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2.5">{error}</p>}
          <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">{busy ? "Saving…" : "Save password"}</Button>
        </form>
      </Card>
    </div>
  );
}
