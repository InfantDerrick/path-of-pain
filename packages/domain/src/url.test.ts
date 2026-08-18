import { describe, expect, it } from "vitest";
import { normalizeSourceUrl } from "./url";

describe("normalizeSourceUrl", () => {
  it("returns null for empty values", () => {
    expect(normalizeSourceUrl("")).toBeNull();
    expect(normalizeSourceUrl("   ")).toBeNull();
  });

  it("rejects non-http schemes", () => {
    expect(normalizeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSourceUrl("file:///etc/passwd")).toBeNull();
  });

  it("keeps https URLs and strips hashes", () => {
    expect(normalizeSourceUrl("https://jobs.example.com/roles/123#apply")).toBe(
      "https://jobs.example.com/roles/123",
    );
  });
});
