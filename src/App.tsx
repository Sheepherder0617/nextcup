import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { NavCtx, useNav, type Nav, type RouteName, type LogTarget } from "./lib/nav";
import { StoreProvider, useStore } from "./lib/store";
import { Avatar, Icon, ToastProvider, cx, useToast } from "./components/ui";
import { Wordmark, LogoMark } from "./components/Logo";
import { LogChatModal } from "./components/LogChatModal";
import { PrepAssistant } from "./components/PrepAssistant";
import { Landing } from "./pages/Landing";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { Contacts } from "./pages/Contacts";
import { ContactForm } from "./pages/ContactForm";
import { ContactProfile } from "./pages/ContactProfile";
import { CalendarPage } from "./pages/Calendar";
import { Schedule } from "./pages/Schedule";
import { ProfilePage } from "./pages/Profile";
import { AuthPage } from "./pages/Auth";

// ---------- Hash router (plain "#name" or "#name-param") ----------
const PARAM_ROUTES: RouteName[] = ["contact", "edit", "schedule"];
const ALL: RouteName[] = ["welcome", "signup", "signin", "dashboard", "contacts", "add-contact", "contact", "edit", "calendar", "schedule", "profile"];

function parseHash(): { name: RouteName | null; param?: string } {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!h) return { name: null };
  if ((ALL as string[]).includes(h)) return { name: h as RouteName };
  for (const r of PARAM_ROUTES) if (h.startsWith(r + "-")) return { name: r, param: h.slice(r.length + 1) };
  return { name: null };
}

function Shell() {
  const store = useStore();
  const toast = useToast();
  const [route, setRoute] = useState(parseHash);
  const [log, setLog] = useState<LogTarget | null>(null);
  const [prep, setPrep] = useState<{ contactId: string; eventId?: string } | null>(null);

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => { if (store.error) { toast(store.error, "error"); store.clearError(); } }, [store.error]);

  const go = useCallback((name: RouteName, param?: string) => {
    const next = "#" + (param ? `${name}-${param}` : name);
    if (location.hash === next) { setRoute(parseHash()); window.scrollTo({ top: 0 }); }
    else location.hash = next;
  }, []);

  const nav = useMemo<Nav>(() => ({
    route, go,
    openLog: (t) => setLog(t ?? {}),
    openPrep: (contactId, eventId) => setPrep({ contactId, eventId }),
  }), [route, go]);

  if (!store.ready) {
    return (
      <div className="min-h-full grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-fg-3"><LogoMark size={64} animated /><span className="text-sm">Brewing your workspace…</span></div>
      </div>
    );
  }

  // Accounts (Supabase): signed-out visitors see the landing page or the sign-in page.
  const { auth } = store;
  if (auth.recovering) return <NavCtx.Provider value={nav}><AuthPage /></NavCtx.Provider>;
  if (auth.enabled && !auth.signedIn) {
    return <NavCtx.Provider value={nav}>{!route.name || route.name === "welcome" ? <Landing /> : <AuthPage key={route.name ?? ""} initialMode={route.name === "signin" ? "signin" : "signup"} />}</NavCtx.Provider>;
  }

  // Default route
  let name = route.name;
  if (name === "signin") name = "signup";
  if (!name) name = store.profile ? "dashboard" : auth.enabled ? "signup" : "welcome";
  if (!store.profile && !["welcome", "signup"].includes(name)) name = auth.enabled ? "signup" : "welcome";
  if (store.profile && auth.enabled && name === "signup") name = "dashboard";

  if (name === "welcome") return <NavCtx.Provider value={nav}><Landing /></NavCtx.Provider>;
  if (name === "signup") return <NavCtx.Provider value={nav}><Onboarding /></NavCtx.Provider>;

  let page: ReactNode;
  switch (name) {
    case "contacts": page = <Contacts />; break;
    case "add-contact": page = <ContactForm key="new" />; break;
    case "edit": page = <ContactForm key={route.param} id={route.param} />; break;
    case "contact": page = <ContactProfile key={route.param} id={route.param!} />; break;
    case "calendar": page = <CalendarPage />; break;
    case "schedule": page = <Schedule key={route.param ?? "new"} contactId={route.param} />; break;
    case "profile": page = <ProfilePage />; break;
    default: page = <Dashboard />;
  }

  return (
    <NavCtx.Provider value={nav}>
      <TopBar active={name} />
      <main className="gutter pt-6 md:pt-8 pb-[calc(112px+env(safe-area-inset-bottom,0px))] md:pb-16">
        <div className="mx-auto max-w-[1280px]">{page}</div>
      </main>
      <BottomBar active={name} />
      <LogChatModal target={log} onClose={() => setLog(null)} />
      <PrepAssistant target={prep} onClose={() => setPrep(null)} />
    </NavCtx.Provider>
  );
}

const LINKS: { name: RouteName; label: string; icon: string }[] = [
  { name: "dashboard", label: "Dashboard", icon: "space_dashboard" },
  { name: "contacts", label: "Contacts", icon: "group" },
  { name: "calendar", label: "Calendar", icon: "calendar_month" },
  { name: "add-contact", label: "Add Contact", icon: "person_add" },
  { name: "schedule", label: "Schedule Event", icon: "event_available" },
];

function isActive(link: RouteName, active: RouteName) {
  if (link === active) return true;
  if (link === "contacts" && (active === "contact" || active === "edit")) return true;
  return false;
}

function TopBar({ active }: { active: RouteName }) {
  const { profile, viewer } = useStore();
  const { go, openLog } = useNav();
  return (
    <header className="sticky z-40 bg-header/95 backdrop-blur border-b border-line" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter">
        <div className="mx-auto max-w-[1280px] h-16 md:h-[72px] flex items-center gap-4">
          <a href="#dashboard" className="shrink-0 rounded-xl"><Wordmark /></a>
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 ml-4">
            {LINKS.map((l) => (
              <a key={l.name} href={"#" + l.name} aria-current={isActive(l.name, active) ? "page" : undefined}
                className={cx("px-3.5 h-10 inline-flex items-center rounded-full text-[14px] font-medium transition",
                  isActive(l.name, active) ? "bg-card text-fg font-semibold shadow-soft" : "text-fg-2 hover:bg-card/70")}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex-1" />
          <button type="button" onClick={() => openLog()} className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-ink text-on-ink text-sm font-semibold shadow-soft hover:opacity-90">
            <Icon name="edit_note" className="text-[20px]" />Log a chat
          </button>
          <button type="button" onClick={() => go("profile")} aria-current={active === "profile" ? "page" : undefined}
            className={cx("flex items-center gap-2.5 rounded-full pl-1 pr-1 md:pr-3 py-1 border transition", active === "profile" ? "bg-card border-line-2" : "border-transparent hover:bg-card/70")}>
            <Avatar name={profile?.name ?? "You"} src={viewer.avatarUrl} size={36} />
            <span className="hidden md:block text-left leading-tight">
              <span className="block text-sm font-semibold">{profile?.name}</span>
              <span className="block text-[11px] font-semibold text-fg-3 max-w-[180px] truncate">{profile?.headline}</span>
            </span>
          </button>
        </div>
      </div>
      <nav aria-label="Sections" className="hidden md:flex lg:hidden gutter pb-2 gap-1 overflow-x-auto">
        {LINKS.map((l) => (
          <a key={l.name} href={"#" + l.name} aria-current={isActive(l.name, active) ? "page" : undefined}
            className={cx("px-3 h-9 inline-flex items-center rounded-full text-[13px] font-medium whitespace-nowrap",
              isActive(l.name, active) ? "bg-card text-fg font-semibold shadow-soft" : "text-fg-2 hover:bg-card/70")}>{l.label}</a>
        ))}
      </nav>
    </header>
  );
}

function BottomBar({ active }: { active: RouteName }) {
  const { openLog } = useNav();
  const tabs: { name: RouteName; label: string; icon: string }[] = [
    { name: "dashboard", label: "Home", icon: "home" },
    { name: "contacts", label: "Contacts", icon: "group" },
    { name: "calendar", label: "Calendar", icon: "calendar_month" },
    { name: "profile", label: "Me", icon: "person" },
  ];
  const Tab = ({ t }: { t: (typeof tabs)[number] }) => (
    <a href={"#" + t.name} aria-current={isActive(t.name, active) ? "page" : undefined}
      className={cx("flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive(t.name, active) ? "text-brand" : "text-fg-3")}>
      <Icon name={t.icon} fill={isActive(t.name, active)} className="text-[24px]" />{t.label}
    </a>
  );
  return (
    <nav aria-label="Tabs" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-header/95 backdrop-blur border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
      <div className="flex items-stretch">
        <Tab t={tabs[0]} /><Tab t={tabs[1]} />
        <div className="flex-1 flex justify-center">
          <button type="button" onClick={() => openLog()} aria-label="Log a chat"
            className="-mt-5 w-14 h-14 rounded-2xl bg-ink text-on-ink grid place-items-center shadow-lift">
            <Icon name="edit_note" className="text-[28px]" />
          </button>
        </div>
        <Tab t={tabs[2]} /><Tab t={tabs[3]} />
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ToastProvider>
  );
}
