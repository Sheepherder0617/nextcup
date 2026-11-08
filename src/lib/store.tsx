import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChatEvent, Contact, Note, Profile, Snapshot } from "./types";

/*
 * Storage layer.
 * - Inside Claude (published artifact): each person's data lives in the artifact's
 *   private per-user store at data/users/<their id>/…, so nobody else can read it.
 * - Anywhere else (local dev, your own hosting): browser localStorage.
 * Swap in Supabase later by writing one more Backend with the same five methods.
 */

type Coll = "contacts" | "events" | "notes";
type Item = Contact | ChatEvent | Note;

interface Backend {
  mode: "cloud" | "local";
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
  mode: "cloud" | "local" | "pending";
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

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    (async () => {
      let b: Backend | null = null;
      const claude = (window as any).claude;
      if (claude?.use) {
        try {
          const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
          if (user) {
            const me = await user.me();
            if (alive) setViewer({ name: me?.name || "", avatarUrl: me?.name ? me.avatarUrl : null });
          }
          const id = user ? await user.id() : null;
          if (db && id) b = cloudBackend(db, id);
        } catch { /* fall back to local */ }
      }
      if (!alive) return;
      b = b ?? localBackend();
      backend.current = b;
      setMode(b.mode);
      stop = b.start(
        (patch) => setSnap((s) => ({ ...s, ...patch })),
        () => setReady(true),
        (msg) => setError(msg),
      );
    })();
    return () => { alive = false; stop(); };
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
  }, [snap, ready, mode, viewer, error, run]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
