// Date helpers. Event times are stored as local wall-clock strings ("YYYY-MM-DDTHH:mm").

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function toLocalInput(d: Date): string {
  return `${todayISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseLocal(s: string): Date {
  const [date, time = "00:00"] = s.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000);
}
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

const fmtDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const fmtShort = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export const formatDate = (d: Date | string) => fmtDate.format(typeof d === "string" ? parseLocal(d) : d);
export const formatShort = (d: Date | string) => fmtShort.format(typeof d === "string" ? parseLocal(d) : d);
export const formatTime = (d: Date | string) => fmtTime.format(typeof d === "string" ? parseLocal(d) : d);
export const formatMonth = (d: Date) => fmtMonth.format(d);

/** "Today", "Tomorrow", "Yesterday", or "Wednesday, Oct 30". */
export function relativeDay(d: Date | string, now = new Date()): string {
  const x = typeof d === "string" ? parseLocal(d) : d;
  const diff = dayDiff(x, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return fmtDay.format(x);
}

/** "in 3 days", "2 days ago", "today". */
export function fromNow(d: Date | string, now = new Date()): string {
  const x = typeof d === "string" ? parseLocal(d) : d;
  const diff = dayDiff(x, now);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return diff < 14 ? `in ${diff} days` : `in ${Math.round(diff / 7)} weeks`;
  const a = -diff;
  return a < 14 ? `${a} days ago` : a < 60 ? `${Math.round(a / 7)} weeks ago` : `${Math.round(a / 30)} months ago`;
}

export function timeRange(start: string, durationMin: number): string {
  const s = parseLocal(start);
  return `${fmtTime.format(s)} – ${fmtTime.format(addMinutes(s, durationMin))}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function timezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const off = -new Date().getTimezoneOffset();
    const sign = off >= 0 ? "+" : "−";
    const h = Math.floor(Math.abs(off) / 60), m = Math.abs(off) % 60;
    return `${tz.replace(/_/g, " ")} (UTC${sign}${h}${m ? ":" + pad(m) : ""})`;
  } catch {
    return "Local time";
  }
}

export function uid(prefix = ""): string {
  const r = Math.random().toString(36).slice(2, 8);
  return prefix + Date.now().toString(36) + r;
}
