import type { ChatEvent, Contact } from "./types";
import { addDays, parseLocal, startOfDay, todayISO } from "./date";

export const byStart = (a: ChatEvent, b: ChatEvent) => a.start.localeCompare(b.start);

export function upcoming(events: ChatEvent[], now = new Date()): ChatEvent[] {
  const cutoff = startOfDay(now).getTime();
  return events.filter((e) => e.status === "planned" && parseLocal(e.start).getTime() >= cutoff).sort(byStart);
}

/** Planned coffee chats whose time hasn't ended yet (and anything later today). */
export function upcomingChats(events: ChatEvent[], now = new Date()): ChatEvent[] {
  return events
    .filter((e) => e.kind === "coffee" && e.status === "planned" && parseLocal(e.start).getTime() + e.durationMin * 60000 >= now.getTime() - 3 * 3600000)
    .sort(byStart);
}

/** Thank-you notes and follow-ups that are planned and due within `days` (overdue included). */
export function dueTasks(events: ChatEvent[], days = 7, now = new Date()): ChatEvent[] {
  const limit = addDays(startOfDay(now), days + 1).getTime();
  return events.filter((e) => e.kind !== "coffee" && e.status === "planned" && parseLocal(e.start).getTime() < limit).sort(byStart);
}

export function isOverdue(e: ChatEvent, now = new Date()): boolean {
  return e.status === "planned" && startOfDay(parseLocal(e.start)).getTime() < startOfDay(now).getTime();
}

/** Coffee chats in the past that haven't been logged yet. */
export function needsDebrief(events: ChatEvent[], now = new Date()): ChatEvent[] {
  return events.filter((e) => e.kind === "coffee" && e.status === "planned" && parseLocal(e.start).getTime() + e.durationMin * 60000 < now.getTime()).sort(byStart);
}

export function lastContactOf(c: Contact, events: ChatEvent[]): string | undefined {
  const dates = [c.firstMeetingDate, c.lastContact]
    .concat(events.filter((e) => e.contactId === c.id && e.status === "done").map((e) => e.start.slice(0, 10)))
    .filter((d): d is string => !!d && d <= todayISO());
  return dates.sort().pop();
}

export function nextChatFor(contactId: string, events: ChatEvent[], now = new Date()): ChatEvent | undefined {
  return upcomingChats(events, now).find((e) => e.contactId === contactId);
}

export function isFirstMeet(e: ChatEvent, events: ChatEvent[]): boolean {
  return e.kind === "coffee" && !events.some((x) => x.contactId === e.contactId && x.kind === "coffee" && x.status === "done" && x.start < e.start);
}

export function inThisWeek(e: ChatEvent, now = new Date()): boolean {
  const s = startOfDay(now);
  const t = parseLocal(e.start).getTime();
  return t >= s.getTime() && t < addDays(s, 7).getTime();
}

export function funnel(contacts: Contact[], events: ChatEvent[]) {
  const scheduled = new Set(events.filter((e) => e.kind === "coffee").map((e) => e.contactId));
  const met = new Set(events.filter((e) => e.kind === "coffee" && e.status === "done").map((e) => e.contactId));
  const followed = new Set(events.filter((e) => e.kind !== "coffee" && e.status === "done").map((e) => e.contactId));
  return [
    { label: "Contacts added", value: contacts.length },
    { label: "Chats scheduled", value: scheduled.size },
    { label: "Chats completed", value: met.size },
    { label: "Followed up", value: followed.size },
  ];
}
