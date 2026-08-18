import { describe, expect, it } from "vitest";
import { buildEmailSuggestionDrafts } from "./suggestions";
import type { OpportunityMatchTarget, RawEmailMessage } from "./types";

const opportunities: OpportunityMatchTarget[] = [
  {
    id: "opp_discord",
    title: "Developer Success Engineer",
    companyName: "Discord",
    companyDomain: "discord.com",
    sourceUrl: "https://job-boards.greenhouse.io/discord/jobs/123",
  },
  {
    id: "opp_reddit",
    title: "Senior Software Engineer",
    companyName: "Reddit",
    companyDomain: "reddit.com",
    sourceUrl: "https://job-boards.greenhouse.io/reddit/jobs/456",
  },
];

function message(overrides: Partial<RawEmailMessage>): RawEmailMessage {
  return {
    provider: "imap",
    providerMessageId: "m_1",
    from: "Discord Recruiting <recruiting@discord.com>",
    subject: "Update on your application",
    receivedAt: new Date("2026-08-18T12:00:00.000Z"),
    text: "After careful consideration, we will not be moving forward with your application for the Developer Success Engineer role at Discord.",
    ...overrides,
  };
}

describe("buildEmailSuggestionDrafts", () => {
  it("creates an explainable rejection suggestion without storing the body", () => {
    const [draft] = buildEmailSuggestionDrafts(message({}), opportunities);

    expect(draft?.assertion.type).toBe("rejection");
    expect(draft?.match?.opportunityId).toBe("opp_discord");
    expect(draft?.proposedEvent.type).toBe("REJECTED");
    expect(draft?.assertion.evidence.length).toBeGreaterThan(0);
    expect(JSON.stringify(draft)).not.toContain(
      "Developer Success Engineer role at Discord",
    );
  });

  it("does not classify guarded rejection language", () => {
    const drafts = buildEmailSuggestionDrafts(
      message({
        text: "This is not a rejection. We are not yet ready to schedule the next interview.",
      }),
      opportunities,
    );

    expect(drafts).toHaveLength(0);
  });

  it("matches interview requests deterministically", () => {
    const [draft] = buildEmailSuggestionDrafts(
      message({
        providerMessageId: "m_2",
        subject: "Discord interview availability",
        text: "We would like to schedule an interview for your Developer Success Engineer application. Please share availability.",
      }),
      opportunities,
    );

    expect(draft?.assertion.type).toBe("interview_request");
    expect(draft?.proposedEvent.type).toBe("INTERVIEW_REQUESTED");
    expect(draft?.match?.opportunityId).toBe("opp_discord");
  });

  it("matches application receipts from subject-only hiring mail", () => {
    const [draft] = buildEmailSuggestionDrafts(
      {
        provider: "imap",
        providerMessageId: "m_roblox",
        from: "no-reply@roblox.com",
        subject: "Thank you for applying to Roblox!",
        receivedAt: new Date("2026-08-18T18:39:07.000Z"),
        text: "We received your application.",
      },
      [
        {
          id: "opp_roblox",
          title: "[2027] Software Engineer, Early Career",
          companyName: "Roblox",
          companyDomain: null,
          sourceUrl: "https://careers.roblox.com/jobs/8072244",
        },
      ],
    );

    expect(draft?.assertion.type).toBe("application_received");
    expect(draft?.match?.opportunityId).toBe("opp_roblox");
    expect(draft?.match?.reasons.some((reason) => reason.includes("roblox"))).toBe(
      true,
    );
  });
});
