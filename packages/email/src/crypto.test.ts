import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "./crypto";

describe("email connection encryption", () => {
  it("round-trips json without plaintext leakage", () => {
    const secret = "phase-seven-test-secret-at-least-32-chars";
    const sealed = encryptJson(
      { username: "derrick@example.com", password: "not-for-logs" },
      secret,
    );

    expect(sealed).not.toContain("not-for-logs");
    expect(decryptJson(sealed, secret)).toEqual({
      username: "derrick@example.com",
      password: "not-for-logs",
    });
  });

  it("fails with the wrong key", () => {
    const sealed = encryptJson(
      { password: "not-for-logs" },
      "phase-seven-test-secret-at-least-32-chars",
    );

    expect(() =>
      decryptJson(sealed, "different-phase-seven-secret-32-chars"),
    ).toThrow();
  });
});
