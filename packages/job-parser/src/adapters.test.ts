import { describe, expect, it } from "vitest";
import { ashbyAdapter, greenhouseAdapter, leverAdapter } from "./adapters";

describe("ATS adapters", () => {
  it("matches common Greenhouse URLs", () => {
    expect(
      greenhouseAdapter.matches(
        new URL("https://boards.greenhouse.io/acme/jobs/1"),
      ),
    ).toBe(true);
  });

  it("infers company from modern Greenhouse job board pages", async () => {
    const extracted = await greenhouseAdapter.extract({
      url: new URL(
        "https://job-boards.greenhouse.io/reddit/jobs/8024892?gh_src=nvi955tz1us",
      ),
      html: `
        <img alt="Reddit Logo" src="https://recruiting.cdn.greenhouse.io/reddit.png">
        <main>
          <h1>Senior Software Engineer, Presence</h1>
          <div class="job-location">Remote - United States</div>
          <section class="description">Build community systems.</section>
        </main>
      `,
    });

    expect(extracted).toMatchObject({
      method: "greenhouse",
      company: "Reddit",
      title: "Senior Software Engineer, Presence",
      externalJobId: "8024892",
    });
  });

  it("falls back to the Greenhouse board slug when no logo text exists", async () => {
    const extracted = await greenhouseAdapter.extract({
      url: new URL("https://job-boards.greenhouse.io/fastly/jobs/1"),
      html: "<main><h1>Engineer</h1></main>",
    });

    expect(extracted.company).toBe("Fastly");
  });

  it("extracts Lever posting data when embedded", async () => {
    const extracted = await leverAdapter.extract({
      url: new URL("https://jobs.lever.co/acme/123"),
      html: `
        <script>
          window.__POSTING__ = {"id":"123","text":"Platform Engineer","company":"Acme","categories":{"location":"Remote","commitment":"Full-time"},"descriptionPlain":"Build systems."};
        </script>
      `,
    });

    expect(extracted).toMatchObject({
      method: "lever",
      title: "Platform Engineer",
      company: "Acme",
      location: "Remote",
      externalJobId: "123",
    });
  });

  it("matches common Ashby URLs", () => {
    expect(
      ashbyAdapter.matches(new URL("https://jobs.ashbyhq.com/acme/123")),
    ).toBe(true);
  });
});
