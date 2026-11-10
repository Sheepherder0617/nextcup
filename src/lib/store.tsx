import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChatEvent, Contact, Note, Profile, Snapshot } from "./types";
import { getSupabase, supabaseEnabled } from "./supabase";

/*
 * Storage layer.
 * - Inside Claude (published artifact): each person's data lives in the artifact's
 *   private per-user store at data/users/<their id>/…, so nobody else can read it.
 * - Own hosting with Supabase configured: each person signs in, and their rows live in
 *   Supabase tables protected by Row Level Security (see supabase/schema.sql).
 * - Neither (quick local tinkering): browser localStorage.
 */

type Coll = "contacts" | "events" | "notes";
type Item = Contact | ChatEvent | Note;

interface Backend {
  mode: "cloud" | "supabase" | "local";
  start(onChange: (patch: Partial<Snapshot>) => void, onReady: () => void, onError: (msg: string) => void): () => void;
  saveProfile(p: Profile | null): Promise<void>;
  put(coll: Coll, item: Item): Promise<void>;
  remove(coll: Coll, id: string): Promise<void>;
}

const clean = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function dbMessage(e: any): string {
  switch (e?.code) {
    case "quota_exceeded": return "Storage is full. Delete some old contacts or notes, then try again.";
    case "resource_exhausted": return "Too many changes at once. Wait a moment and try again.";
    case "revoked": return "Access to this page changed. Reload to continue.";
    default: return "Couldn’t save that change. Check your connection and try again.";
  }
}

function cloudBackend(db: any, userId: string): Backend {
  const base = db.doc(`data/users/${userId}/profile`);
  const write = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e: any) {
      if (e?.code === "unavailable") { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); }
      throw e;
    }
  };
  return {
    mode: "cloud",
    start(onChange, onReady, onError) {
      const seen = new Set<string>();
      const mark = (k: string) => { seen.add(k); if (seen.size === 4) onReady(); };
      const unsubs: (() => void)[] = [];
      unsubs.push(base.onSnapshot(
        (s: any) => { onChange({ profile: s.exists ? ((s.data()?.profile as Profile) ?? null) : null }); mark("profile"); },
        (e: any) => { onError(dbMessage(e)); mark("profile"); },
      ));
      (["contacts", "events", "notes"] as Coll[]).forEach((c) => {
        unsubs.push(base.collection(c).onSnapshot(
          (qs: any) => { onChange({ [c]: qs.docs.map((d: any) => d.data()) } as Partial<Snapshot>); mark(c); },
          (e: any) => { onError(dbMessage(e)); mark(c); },
        ));
      });
      return () => unsubs.forEach((u) => u());
    },
    saveProfile: (p) => write(() => (p ? base.set({ profile: clean(p) }) : base.delete())),
    put: (coll, item) => write(() => base.collection(coll).doc(item.id).set(clean(item))),
    remove: (coll, id) => write(() => base.collection(coll).doc(id).delete()),
  };
}

function supabaseBackend(sb: any, userId: string): Backend {
  const check = ({ error }: { error: any }) => { if (error) throw error; };
  return {
    mode: "supabase",
    start(onChange, onReady, onError) {
      let alive = true;
      (async () => {
        try {
          const [p, c, e, n] = await Promise.all([
            sb.from("profiles").select("data").maybeSingle(),
            sb.from("contacts").select("data"),
            sb.from("events").select("data"),
            sb.from("notes").select("data"),
          ]);
          for (const r of [p, c, e, n]) check(r);
          if (!alive) return;
          onChange({
            profile: (p.data?.data as Profile) ?? null,
            contacts: (c.data ?? []).map((r: any) => r.data),
            events: (e.data ?? []).map((r: any) => r.data),
            notes: (n.data ?? []).map((r: any) => r.data),
          });
        } catch {
          if (alive) onError("Couldn’t load your data. Check your connection and reload the page.");
        } finally {
          if (alive) onReady();
        }
      })();
      return () => { alive = false; };
    },
    async saveProfile(p) {
      if (p) check(await sb.from("profiles").upsert({ user_id: userId, data: clean(p), updated_at: new Date().toISOString() }));
      else check(await sb.from("profiles").delete().eq("user_id", userId));
    },
    async put(coll, item) {
      check(await sb.from(coll).upsert({ user_id: userId, id: item.id, data: clean(item), updated_at: new Date().toISOString() }, { onConflict: "user_id,id" }));
    },
    async remove(coll, id) {
      check(await sb.from(coll).delete().eq("user_id", userId).eq("id", id));
    },
  };
}

const LS_KEY = "nextcup:v1";
function localBackend(): Backend {
  let mem: Snapshot = { profile: null, contacts: [], events: [], notes: [] };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) mem = { ...mem, ...JSON.parse(raw) };
  } catch { /* storage blocked: keep in memory for this visit */ }
  const persist = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); } catch { /* ignore */ } };
  let emit: (p: Partial<Snapshot>) => void = () => {};
  return {
    mode: "local",
    start(onChange, onReady) { emit = onChange; onChange(mem); onReady(); return () => {}; },
    async saveProfile(p) { mem = { ...mem, profile: p }; persist(); emit({ profile: p }); },
    async put(coll, item) {
      const list = (mem[coll] as Item[]).filter((x) => x.id !== item.id).concat(clean(item));
      mem = { ...mem, [coll]: list }; persist(); emit({ [coll]: list } as Partial<Snapshot>);
    },
    async remove(coll, id) {
      const list = (mem[coll] as Item[]).filter((x) => x.id !== id);
      mem = { ...mem, [coll]: list }; persist(); emit({ [coll]: list } as Partial<Snapshot>);
    },
  };
}

export interface Viewer { name: string; avatarUrl: string | null }

interface StoreValue extends Snapshot {
  ready: boolean;
  mode: "cloud" | "supabase" | "local" | "pending";
  /** Account sign-in (only when Supabase is configured). */
  auth: {
    enabled: boolean;
    signedIn: boolean;
    email: string;
    /** True after the person opened a password-reset link and must choose a new password. */
    recovering: boolean;
    updatePassword(password: string): Promise<void>;
    signOut(): Promise<void>;
  };
  viewer: Viewer;
  error: string | null;
  clearError(): void;
  saveProfile(p: Profile): Promise<void>;
  upsertContact(c: Contact): Promise<void>;
  deleteContact(id: string): Promise<void>;
  upsertEvent(e: ChatEvent): Promise<void>;
  deleteEvent(id: string, alsoNotes?: boolean): Promise<void>;
  upsertNote(n: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  wipeAll(): Promise<void>;
  contactById(id: string): Contact | undefined;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>({ profile: null, contacts: [], events: [], notes: [] });
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<StoreValue["mode"]>("pending");
  const [viewer, setViewer] = useState<Viewer>({ name: "", avatarUrl: null });
  const [error, setError] = useState<string | null>(null);
  const backend = useRef<Backend | null>(null);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // Decide where data lives: Claude's private store, Supabase (after sign-in), or this browser.
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    (async () => {
      const claude = (window as any).claude;
      if (claude?.use) {
        try {
          const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
          if (user) {
            const me = await user.me();
            if (alive) setViewer({ name: me?.name || "", avatarUrl: me?.name ? me.avatarUrl : null });
          }
          const id = user ? await user.id() : null;
          if (db && id && alive) {
            const b = cloudBackend(db, id);
            backend.current = b;
            setMode(b.mode);
            stop = b.start((patch) => setSnap((s) => ({ ...s, ...patch })), () => setReady(true), (msg) => setError(msg));
            return;
          }
        } catch { /* fall through */ }
      }
      if (!alive) return;
      if (supabaseEnabled) {
        setMode("supabase");
        try {
          const sb = await getSupabase();
          const { data } = await sb.auth.getSession();
          const u = data?.session?.user;
          if (alive) setSession(u ? { userId: u.id, email: u.email ?? "" } : null);
          const { data: sub } = sb.auth.onAuthStateChange((event: string, s: any) => {
            if (event === "PASSWORD_RECOVERY") setRecovering(true);
            const nu = s?.user;
            setSession((prev) => (nu ? (prev?.userId === nu.id ? prev : { userId: nu.id, email: nu.email ?? "" }) : null));
          });
          stop = () => sub?.subscription?.unsubscribe();
        } catch {
          if (alive) setError("Couldn’t reach the sign-in service. Check your connection and reload.");
        } finally {
          if (alive) setAuthChecked(true);
        }
        return;
      }
      const b = localBackend();
      backend.current = b;
      setMode(b.mode);
      stop = b.start((patch) => setSnap((s) => ({ ...s, ...patch })), () => setReady(true), (msg) => setError(msg));
    })();
    return () => { alive = false; stop(); };
  }, []);

  // Supabase: (re)load the signed-in person's data whenever the account changes.
  useEffect(() => {
    if (mode !== "supabase" || !authChecked) return;
    setSnap({ profile: null, contacts: [], events: [], notes: [] });
    if (!session) { backend.current = null; setReady(true); return; }
    setReady(false);
    let stop = () => {};
    let alive = true;
    getSupabase().then((sb) => {
      if (!alive) return;
      const b = supabaseBackend(sb, session.userId);
      backend.current = b;
      stop = b.start((patch) => alive && setSnap((s) => ({ ...s, ...patch })), () => alive && setReady(true), (msg) => setError(msg));
    });
    return () => { alive = false; stop(); };
  }, [mode, authChecked, session?.userId]);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    await sb?.auth.signOut();
    setSession(null);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    setRecovering(false);
  }, []);

  const run = useCallback(async (fn: (b: Backend) => Promise<void>) => {
    const b = backend.current;
    if (!b) return;
    try { await fn(b); } catch (e) { setError(dbMessage(e)); throw e; }
  }, []);

  const value = useMemo<StoreValue>(() => {
    const upsert = <K extends Coll>(coll: K, item: Item) => {
      setSnap((s) => ({ ...s, [coll]: (s[coll] as Item[]).filter((x) => x.id !== item.id).concat(item) }));
      return run((b) => b.put(coll, item));
    };
    const remove = (coll: Coll, id: string) => {
      setSnap((s) => ({ ...s, [coll]: (s[coll] as Item[]).filter((x) => x.id !== id) }));
      return run((b) => b.remove(coll, id));
    };
    return {
      ...snap,
      ready,
      mode,
      auth: { enabled: mode === "supabase", signedIn: !!session, email: session?.email ?? "", recovering, updatePassword, signOut },
      viewer,
      error,
      clearError: () => setError(null),
      saveProfile: (p) => { setSnap((s) => ({ ...s, profile: p })); return run((b) => b.saveProfile(p)); },
      upsertContact: (c) => upsert("contacts", c),
      async deleteContact(id) {
        const s = snapRef.current;
        await Promise.all([
          ...s.events.filter((e) => e.contactId === id).map((e) => remove("events", e.id)),
          ...s.notes.filter((n) => n.contactId === id).map((n) => remove("notes", n.id)),
          remove("contacts", id),
        ]);
      },
      upsertEvent: (e) => upsert("events", e),
      async deleteEvent(id, alsoNotes) {
        const s = snapRef.current;
        const jobs = [remove("events", id)];
        if (alsoNotes) s.notes.filter((n) => n.eventId === id).forEach((n) => jobs.push(remove("notes", n.id)));
        await Promise.all(jobs);
      },
      upsertNote: (n) => upsert("notes", n),
      deleteNote: (id) => remove("notes", id),
      async wipeAll() {
        const s = snapRef.current;
        await Promise.all([
          ...s.contacts.map((c) => remove("contacts", c.id)),
          ...s.events.map((e) => remove("events", e.id)),
          ...s.notes.map((n) => remove("notes", n.id)),
        ]);
        setSnap((x) => ({ ...x, profile: null }));
        await run((b) => b.saveProfile(null));
      },
      contactById: (id) => snap.contacts.find((c) => c.id === id),
    };
  }, [snap, ready, mode, viewer, error, run, session, signOut, recovering, updatePassword]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
