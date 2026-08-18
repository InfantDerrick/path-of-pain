export type TerminalStageType =
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "closed"
  | null;

export type DefaultPipelineStage = {
  name: string;
  slug: string;
  order: number;
  terminalType: TerminalStageType;
  hiddenByDefault?: boolean;
};

export const defaultPipelineStages: readonly DefaultPipelineStage[] = [
  { name: "Saved", slug: "saved", order: 0, terminalType: null },
  { name: "Applied", slug: "applied", order: 1, terminalType: null },
  { name: "Assessment / OA", slug: "assessment", order: 2, terminalType: null },
  {
    name: "Recruiter Screen",
    slug: "recruiter",
    order: 3,
    terminalType: null,
  },
  {
    name: "Technical Screen",
    slug: "technical",
    order: 4,
    terminalType: null,
  },
  { name: "Onsite", slug: "onsite", order: 5, terminalType: null },
  {
    name: "Team Match",
    slug: "team-match",
    order: 6,
    terminalType: null,
    hiddenByDefault: true,
  },
  { name: "Offer", slug: "offer", order: 7, terminalType: null },
  { name: "Negotiation", slug: "negotiation", order: 8, terminalType: null },
  { name: "Accepted", slug: "accepted", order: 9, terminalType: "accepted" },
];

export function visibleDefaultStages() {
  return defaultPipelineStages.filter((stage) => !stage.hiddenByDefault);
}
