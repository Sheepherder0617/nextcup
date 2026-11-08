import type { ChatEvent, Contact } from "./types";
import { KIND_LABEL, FORMAT_LABEL } from "./types";
import { addMinutes, parseLocal } from "./date";

/** Offer a generated file. Inside Claude this goes through the downloads capability;
 *  elsewhere it falls back to a normal browser download. Returns false if declined/unavailable. */
export async function saveFile(filename: string, data: string, mime = "text/plain"): Promise<boolean> {
  const claude = (window as any).claude;
  if (claude?.use) {
    try {
      const dl = await claude.use("downloads");
      if (dl) { await dl.save({ filename, data: new Blob([data], { type: mime }) }); return true; }
    } catch { return false; }
    return false;
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

export async function downloadsAvailable(): Promise<boolean> {
  const claude = (window as any).claude;
  if (!claude?.use) return true;
  try { return !!(await claude.use("downloads")); } catch { return false; }
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function eventToIcs(e: ChatEvent, c: Contact | undefined): string {
  const start = parseLocal(e.start);
  const end = addMinutes(start, e.durationMin);
  const who = c?.name ?? "contact";
  const title = e.kind === "coffee" ? `Coffee chat with ${who}` : `${KIND_LABEL[e.kind]}: ${who}`;
  const desc = [
    e.topic ? `Topic: ${e.topic}` : "",
    e.format ? `Format: ${FORMAT_LABEL[e.format]}` : "",
    e.link ? `Link: ${e.link}` : "",
    "Planned with NextCup",
  ].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NextCup//Coffee Chat Tracker//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@nextcup`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(desc)}`,
    e.location ? `LOCATION:${esc(e.location)}` : e.link ? `LOCATION:${esc(e.link)}` : "",
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc("Prep for " + title)}`, "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
