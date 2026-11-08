import { createContext, useContext } from "react";

export type RouteName = "welcome" | "signup" | "dashboard" | "contacts" | "add-contact" | "contact" | "edit" | "calendar" | "schedule" | "profile";

export interface LogTarget { contactId?: string; eventId?: string }

export interface Nav {
  route: { name: RouteName | null; param?: string };
  go(name: RouteName, param?: string): void;
  openLog(t?: LogTarget): void;
  openPrep(contactId: string, eventId?: string): void;
}

/** One-shot intents handed from one screen to the next (e.g. "generate the prep brief when the profile opens"). */
export const intent: { generatePrepFor?: string; tab?: "overview" | "prep" } = {};

export const NavCtx = createContext<Nav | null>(null);
export const useNav = () => useContext(NavCtx)!;
