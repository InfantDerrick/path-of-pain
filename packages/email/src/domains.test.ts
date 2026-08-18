import { describe, expect, it } from "vitest";
import { domainRoot, domainsRelated } from "./domains";

describe("domainsRelated", () => {
  it("treats company subdomains as the same employer", () => {
    expect(domainsRelated("roblox.com", "careers.roblox.com")).toBe(true);
    expect(domainsRelated("gh-mail.roblox.com", "roblox.com")).toBe(true);
  });

  it("does not relate unrelated employers", () => {
    expect(domainsRelated("roblox.com", "discord.com")).toBe(false);
    expect(domainsRelated("linkedin.com", "roblox.com")).toBe(false);
  });
});

describe("domainRoot", () => {
  it("extracts the stable root domain", () => {
    expect(domainRoot("careers.roblox.com")).toBe("roblox.com");
    expect(domainRoot("roblox.com")).toBe("roblox.com");
  });
});
