import { describe, expect, it } from "vitest";
import { createOpportunityInput } from "./opportunity-input";

describe("createOpportunityInput", () => {
  it("requires a title and company", () => {
    const parsed = createOpportunityInput.safeParse({
      title: "Staff Engineer",
      companyName: "Acme",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.intent).toBe("SAVE");
    }
  });

  it("rejects a blank title", () => {
    const parsed = createOpportunityInput.safeParse({
      title: "  ",
      companyName: "Acme",
    });
    expect(parsed.success).toBe(false);
  });
});
