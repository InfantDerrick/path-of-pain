import type {
  EmailAssertion,
  EmailAssertionType,
  NormalizedEmailMessage,
} from "./types";

type RuleSet = {
  type: EmailAssertionType;
  eventType: string;
  summary: string;
  strong: string[];
  medium: string[];
  weak: string[];
  guards?: string[];
};

const RULES: RuleSet[] = [
  {
    type: "rejection",
    eventType: "REJECTED",
    summary: "This looks like the company may have closed the loop.",
    strong: [
      "will not be moving forward",
      "not moving forward with your application",
      "decided to proceed with other candidates",
      "unable to offer you",
      "not selected",
    ],
    medium: ["after careful consideration", "pursue other candidates"],
    weak: ["unfortunately", "competitive applicant pool"],
    guards: ["not a rejection", "not final", "not yet", "cannot reject"],
  },
  {
    type: "interview_request",
    eventType: "INTERVIEW_REQUESTED",
    summary: "This looks like an interview or scheduling request.",
    strong: ["schedule an interview", "next interview", "meet with"],
    medium: ["availability", "calendar", "calendly", "interview"],
    weak: ["chat", "conversation", "recruiter screen"],
  },
  {
    type: "assessment",
    eventType: "ASSESSMENT_REQUESTED",
    summary: "This looks like an assessment or coding challenge.",
    strong: ["online assessment", "coding challenge", "take-home"],
    medium: ["assessment", "hackerrank", "codesignal", "codility"],
    weak: ["complete by", "technical exercise"],
  },
  {
    type: "offer",
    eventType: "OFFER_RECEIVED",
    summary: "This looks like an offer signal.",
    strong: ["pleased to offer", "extend an offer", "offer letter"],
    medium: ["start date", "compensation package"],
    weak: ["congratulations"],
    guards: ["offer resources", "offer preparation", "how to get an offer"],
  },
  {
    type: "application_received",
    eventType: "APPLICATION_RECEIVED",
    summary: "This looks like an application receipt.",
    strong: [
      "received your application",
      "thank you for applying",
      "application has been submitted",
    ],
    medium: ["application received", "we have your application"],
    weak: ["thanks for applying"],
  },
];

export function eventTypeForAssertion(type: EmailAssertionType) {
  return RULES.find((rule) => rule.type === type)?.eventType ?? "EMAIL_SIGNAL";
}

function phraseMatches(text: string, phrases: string[]) {
  return phrases.filter((phrase) => text.includes(phrase));
}

function scoreRule(
  text: string,
  subject: string,
  rule: RuleSet,
): EmailAssertion {
  const haystack = `${subject} ${text}`.toLowerCase();
  const bodyOnly = text.toLowerCase();
  const strong = phraseMatches(bodyOnly, rule.strong);
  const medium = phraseMatches(haystack, rule.medium);
  const weak = phraseMatches(haystack, rule.weak);
  const guards = phraseMatches(haystack, rule.guards ?? []);
  let score = strong.length * 42 + medium.length * 22 + weak.length * 9;

  if (rule.type === "rejection" && strong.length === 0 && medium.length < 2) {
    score = Math.min(score, 34);
  }
  if (rule.type === "offer" && strong.length === 0) {
    score = Math.min(score, 40);
  }
  if (rule.type === "application_received") {
    const higherIntent = ["interview", "assessment", "offer", "not selected"];
    if (higherIntent.some((phrase) => haystack.includes(phrase))) {
      score = Math.max(0, score - 22);
    }
  }
  if (guards.length > 0) {
    score = Math.max(0, score - guards.length * 45);
  }

  const evidence = [
    ...strong.map((phrase) => `Strong cue: "${phrase}"`),
    ...medium.map((phrase) => `Supporting cue: "${phrase}"`),
    ...weak.map((phrase) => `Weak cue: "${phrase}"`),
  ].slice(0, 5);

  return {
    type: rule.type,
    confidence: Math.min(99, score),
    summary: rule.summary,
    evidence,
    ruleIds: [
      ...strong.map((phrase) => `${rule.type}:strong:${phrase}`),
      ...medium.map((phrase) => `${rule.type}:medium:${phrase}`),
      ...weak.map((phrase) => `${rule.type}:weak:${phrase}`),
    ],
    blockingReasons: guards.map((phrase) => `Guard phrase: "${phrase}"`),
  };
}

export function classifyEmailMessage(
  message: NormalizedEmailMessage,
): EmailAssertion | null {
  const subject = message.subject ?? "";
  const candidates = RULES.map((rule) =>
    scoreRule(message.text, subject, rule),
  ).filter(
    (candidate) =>
      candidate.confidence >= 35 &&
      candidate.evidence.length > 0 &&
      candidate.blockingReasons.length === 0,
  );

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] ?? null;
}
