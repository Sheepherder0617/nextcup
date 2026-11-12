// Data model. Every record belongs to one signed-in person.
// The same shapes map 1:1 to Supabase tables later (see README).

export type RoleType = "recruiter" | "professional" | "former_manager" | "mentor" | "alumni";
export type Goal = "career_exploration" | "advice" | "relationship" | "job_opportunities";
export type EventKind = "coffee" | "thankyou" | "followup";
export type Format = "video" | "inperson" | "phone";
export type NoteKind = "debrief" | "prep" | "intro" | "note" | "followup_response" | "followup_message";
export type Tone = "curious" | "warm" | "direct";

export interface PrepBrief {
  opener: string;
  questions: string[];
  icebreakers: string[];
  agenda: { minutes: number; item: string }[];
  research: string[];
  generatedAt: string;
}

export interface FollowUpIdeas {
  recommendedDate: string; // YYYY-MM-DD
  ideas: { title: string; message: string; why: string }[];
  generatedAt: string;
}

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  roleTypes: RoleType[];
  school?: string;
  metVia: "event" | "online";
  metAt: string;
  firstMeetingDate?: string; // YYYY-MM-DD
  lastContact?: string; // YYYY-MM-DD
  goals: Goal[];
  notes: string; // background / research
  linkedin?: string;
  email?: string;
  checklist?: ChecklistItem[];
  aiPrep?: PrepBrief;
  aiFollowUps?: FollowUpIdeas;
  createdAt: string;
  updatedAt: string;
}

export interface ChatEvent {
  id: string;
  contactId: string;
  kind: EventKind;
  start: string; // local "YYYY-MM-DDTHH:mm"
  durationMin: number;
  format?: Format;
  location?: string;
  link?: string;
  title?: string;
  topic?: string;
  status: "planned" | "done";
  draft?: string; // AI or hand-written thank-you / follow-up message
  createdAt: string;
}

export interface Note {
  id: string;
  contactId: string;
  eventId?: string;
  date: string; // YYYY-MM-DD
  headline: string;
  body: string;
  nextStep?: string;
  kind: NoteKind;
  pinned?: boolean;
  createdAt: string;
}

export interface Profile {
  name: string;
  email?: string;
  headline: string;
  school: string;
  location: string;
  status: "active" | "exploring" | "paused";
  cycle: string;
  targetRoles: string[];
  wishlist: string[];
  pitches: { s30: string; s60: string; s120: string };
  resumeText?: string;
  skills: string[];
  tone: Tone;
  durationMin: number;
  followUpWeeks: number;
  emailReminders?: boolean; // preview setting: shown in Calendar, no emails are sent yet
  createdAt: string;
}

export interface Snapshot {
  profile: Profile | null;
  contacts: Contact[];
  events: ChatEvent[];
  notes: Note[];
}

export const ROLE_LABEL: Record<RoleType, string> = {
  recruiter: "Recruiter",
  professional: "Professional",
  former_manager: "Former Manager",
  mentor: "Mentor",
  alumni: "Alumni",
};
export const ROLE_ICON: Record<RoleType, string> = {
  recruiter: "badge",
  professional: "work",
  former_manager: "supervisor_account",
  mentor: "school",
  alumni: "local_cafe",
};
export const GOAL_LABEL: Record<Goal, string> = {
  career_exploration: "Career Exploration",
  advice: "Advice & Mentorship",
  relationship: "Relationship Building",
  job_opportunities: "Job Opportunities",
};
export const GOAL_HINT: Record<Goal, string> = {
  career_exploration: "Learn about career paths, roles, industries and companies",
  advice: "Get career guidance and learn from their experience",
  relationship: "Build a lasting professional connection",
  job_opportunities: "Discover openings, internships or referrals",
};
export const KIND_LABEL: Record<EventKind, string> = {
  coffee: "Coffee Chat",
  thankyou: "Thank-You Note",
  followup: "Follow-up",
};
export const KIND_ICON: Record<EventKind, string> = {
  coffee: "coffee",
  thankyou: "mark_email_read",
  followup: "task_alt",
};
export const FORMAT_LABEL: Record<Format, string> = {
  video: "Virtual video",
  inperson: "In-person coffee",
  phone: "Phone call",
};
export const FORMAT_ICON: Record<Format, string> = {
  video: "videocam",
  inperson: "local_cafe",
  phone: "call",
};
export const TONE_LABEL: Record<Tone, { title: string; hint: string }> = {
  curious: { title: "Curious & Humble", hint: "Best for senior VP / Director chats" },
  warm: { title: "Warm Professional", hint: "Balanced, collegial and proactive" },
  direct: { title: "Direct & Career-Focused", hint: "Crisp questions on hiring bars & referrals" },
};
