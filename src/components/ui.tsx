import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Icon({ name, className, fill }: { name: string; className?: string; fill?: boolean }) {
  return <span aria-hidden="true" className={cx("ms", fill && "fill", className)}>{name}</span>;
}

type BtnVariant = "primary" | "secondary" | "ghost" | "soft" | "danger" | "ai";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90 shadow-soft",
  secondary: "bg-card text-fg border border-line-2 hover:bg-card-2",
  ghost: "text-fg-2 hover:bg-sunken",
  soft: "bg-sunken text-fg hover:bg-card-2 border border-line",
  danger: "bg-danger text-card hover:opacity-90",
  ai: "text-on-peach border border-line-2 bg-[linear-gradient(120deg,var(--peach),var(--blue-soft))] hover:brightness-[1.03]",
};
export function Button({ variant = "secondary", size = "md", icon, iconRight, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; icon?: string; iconRight?: string }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        size === "sm" ? "text-[13px] px-3 h-8" : size === "lg" ? "text-[15px] px-5 h-11" : "text-sm px-4 h-9",
        BTN[variant], className,
      )}
    >
      {icon && <Icon name={icon} className="text-[18px]" />}
      {children}
      {iconRight && <Icon name={iconRight} className="text-[18px]" />}
    </button>
  );
}

type ChipTone = "peach" | "sand" | "blue" | "neutral" | "danger" | "ink";
const CHIP: Record<ChipTone, string> = {
  peach: "bg-peach text-on-peach",
  sand: "bg-sand text-on-peach",
  blue: "bg-blue-soft text-on-blue-soft",
  neutral: "bg-sunken text-fg-2 border border-line",
  danger: "bg-danger-soft text-danger",
  ink: "bg-ink text-on-ink",
};
export function Chip({ tone = "neutral", icon, children, className }: { tone?: ChipTone; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.03em] whitespace-nowrap", CHIP[tone], className)}>
      {icon && <Icon name={icon} className="text-[13px]" />}
      {children}
    </span>
  );
}

const AVATAR_TONES = ["#c98b5e", "#8a6a54", "#587891", "#9b6b4a", "#6f7e64", "#a46b6b", "#7d5632", "#5f6f8a"];
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}
export function Avatar({ name, src, size = 44, ring }: { name: string; src?: string | null; size?: number; ring?: boolean }) {
  const tone = AVATAR_TONES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      className={cx("inline-grid place-items-center rounded-full shrink-0 overflow-hidden font-serif font-semibold text-white select-none", ring && "ring-2 ring-card")}
      style={{ width: size, height: size, background: tone, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials(name)}
    </span>
  );
}

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: any }) {
  return <As className={cx("bg-card rounded-2xl border border-line shadow-soft", className)}>{children}</As>;
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">{children}</label>
      {hint && <span className="text-[12px] text-fg-3">{hint}</span>}
    </div>
  );
}

const fieldBase = "w-full rounded-lg bg-sunken border border-transparent px-3 py-2 text-[15px] outline-none transition focus:border-brand-2 focus:bg-card focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-2)_18%,transparent)]";
export function Input({ icon, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: string }) {
  return (
    <div className="relative">
      {icon && <Icon name={icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-fg-3 pointer-events-none" />}
      <input {...rest} className={cx(fieldBase, icon && "pl-10", className)} />
    </div>
  );
}
export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(fieldBase, "resize-y min-h-[96px] leading-relaxed", className)} />;
}
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={cx(fieldBase, "appearance-none pr-10", className)}>{children}</select>
      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-fg-3 pointer-events-none" />
    </div>
  );
}

export function Toggle({ id, checked, onChange, label, hint, icon }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; icon?: string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 rounded-xl bg-card-2 border border-line p-3.5 cursor-pointer">
      {icon && <span className="grid place-items-center w-9 h-9 rounded-lg bg-card text-brand"><Icon name={icon} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-fg-3">{hint}</span>}
      </span>
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative w-11 h-6 rounded-full bg-line-2 transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-card after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-sunken p-1 gap-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("px-3 h-8 rounded-md text-[13px] font-semibold transition", value === o.value ? "bg-card shadow-soft text-fg" : "text-fg-3 hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide, labelledBy = "modal-title" }:
  { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus(), 30);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-[rgb(20_12_6/0.45)] backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className={cx("relative w-full rise bg-card rounded-t-3xl sm:rounded-2xl shadow-lift border border-line max-h-[92dvh] flex flex-col", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-3">
          <h2 id={labelledBy} className="font-serif text-[24px] leading-tight font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center w-9 h-9 -mr-2 rounded-full text-fg-3 hover:bg-sunken"><Icon name="close" /></button>
        </div>
        <div className="px-5 sm:px-6 pb-4 overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Thinking({ label = "Thinking" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-fg-3" role="status">
      <span className="typing inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-2" />)}</span>
      {label}…
    </span>
  );
}

export function Empty({ icon, title, children, action }: { icon: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="text-center px-6 py-8 flex flex-col items-center gap-3">
      <span className="grid place-items-center w-14 h-14 rounded-2xl bg-peach text-on-peach"><Icon name={icon} className="text-[28px]" /></span>
      <h3 className="font-serif text-[22px] font-semibold">{title}</h3>
      {children && <p className="text-fg-2 max-w-[44ch]">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Toasts ----------
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[70] left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none w-[min(92vw,420px)]"
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx("rise pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lift flex items-center gap-2",
            t.tone === "error" ? "bg-danger-soft text-danger border border-danger/30" : "bg-ink text-on-ink")}>
            <Icon name={t.tone === "error" ? "error" : "check_circle"} className="text-[18px]" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function copyText(text: string): Promise<boolean> {
  return navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);
}
