import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createLocalStorageAdapter,
  sanitizeFilename,
  sha256Hex,
  storageKey,
} from ".";

describe("storage", () => {
  it("sanitizes filenames into stable local names", () => {
    expect(sanitizeFilename("../Offer Letter?.pdf")).toBe("Offer-Letter.pdf");
    expect(sanitizeFilename("   ")).toBe("file");
  });

  it("stores and reads local objects under a safe key", async () => {
    const root = await mkdtemp(join(tmpdir(), "path-of-pain-storage-"));
    const storage = createLocalStorageAdapter(root);
    const body = new TextEncoder().encode("paper trail");
    const key = storageKey(["attachments", "user 1", "opp 2", "Offer.pdf"]);

    const object = await storage.put(key, body, {
      filename: "Offer.pdf",
      contentType: "application/pdf",
    });

    expect(object.size).toBe(body.byteLength);
    expect(sha256Hex(body)).toHaveLength(64);
    await expect(storage.get(key)).resolves.toEqual(body);
  });
});
