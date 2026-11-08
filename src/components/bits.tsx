import { Chip, Icon } from "./ui";
import { GOAL_LABEL, ROLE_ICON, ROLE_LABEL, type Contact, type Goal, type RoleType } from "../lib/types";

const ROLE_TONE: Record<RoleType, "peach" | "sand" | "blue" | "neutral"> = {
  alumni: "sand",
  professional: "neutral",
  mentor: "peach",
  recruiter: "blue",
  former_manager: "neutral",
};

export function RoleChips({ roles, school }: { roles: RoleType[]; school?: string }) {
  return (
    <>
      {roles.map((r) => (
        <Chip key={r} tone={ROLE_TONE[r]}>{r === "alumni" && school ? `Alumni (${school})` : ROLE_LABEL[r]}</Chip>
      ))}
    </>
  );
}

export function GoalChips({ goals }: { goals: Goal[] }) {
  return <>{goals.map((g) => <Chip key={g} tone="sand">{GOAL_LABEL[g]}</Chip>)}</>;
}

export function MetLine({ c }: { c: Contact }) {
  if (!c.metAt) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-3">
      <Icon name={c.metVia === "online" ? "link" : "location_on"} className="text-[16px]" />
      {c.metVia === "online" ? `Met online (${c.metAt})` : `Met at ${c.metAt}`}
    </span>
  );
}

export { ROLE_ICON };
