import { describe, expect, it } from "vitest";
import { defaultPipelineStages, visibleDefaultStages } from "./pipeline";

describe("default pipeline", () => {
  it("starts at Saved and ends at Accepted", () => {
    expect(defaultPipelineStages[0]?.slug).toBe("saved");
    expect(defaultPipelineStages.at(-1)?.slug).toBe("accepted");
  });

  it("keeps Team Match hidden by default", () => {
    expect(
      visibleDefaultStages().some((stage) => stage.slug === "team-match"),
    ).toBe(false);
    expect(
      defaultPipelineStages.some(
        (stage) => stage.slug === "team-match" && stage.hiddenByDefault,
      ),
    ).toBe(true);
  });

  it("uses unique stage orders", () => {
    const orders = defaultPipelineStages.map((stage) => stage.order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
