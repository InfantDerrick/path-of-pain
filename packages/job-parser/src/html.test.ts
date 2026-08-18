import { describe, expect, it } from "vitest";
import { parseHtml } from "./html";

describe("parseHtml", () => {
  it("extracts schema.org JobPosting JSON-LD", () => {
    const parsed = parseHtml(`
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Frontend Engineer",
          "hiringOrganization": { "name": "Paper Co" },
          "jobLocation": {
            "address": {
              "addressLocality": "Boston",
              "addressRegion": "MA",
              "addressCountry": "US"
            }
          },
          "description": "<p>Build calm interfaces.</p>",
          "employmentType": "FULL_TIME"
        }
      </script>
    `);

    expect(parsed).toMatchObject({
      method: "json-ld",
      title: "Frontend Engineer",
      company: "Paper Co",
      location: "Boston, MA, US",
      employmentType: "FULL_TIME",
    });
  });

  it("falls back to static HTML when JSON-LD is malformed", () => {
    const parsed = parseHtml(`
      <script type="application/ld+json">{ nope }</script>
      <main>
        <h1>Backend Engineer</h1>
        <div class="job-location">Remote</div>
        <section class="description">Own the API.</section>
      </main>
    `);

    expect(parsed).toMatchObject({
      method: "static-html",
      title: "Backend Engineer",
      location: "Remote",
    });
  });

  it("prefers piped Open Graph location over sparse JSON-LD location", () => {
    const parsed = parseHtml(`
      <meta property="og:title" content="Full Stack Software Engineer | USA - Remote | Netflix">
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Full Stack Software Engineer",
          "hiringOrganization": { "name": "Netflix" },
          "jobLocation": {
            "address": {
              "addressLocality": "Panamá",
              "addressRegion": "Provincia de Panamá,PA"
            }
          },
          "description": "Build entertainment systems."
        }
      </script>
    `);

    expect(parsed).toMatchObject({
      method: "json-ld",
      title: "Full Stack Software Engineer",
      company: "Netflix",
      location: "USA - Remote",
    });
  });

  it("extracts salary ranges from JSON-LD descriptions", () => {
    const parsed = parseHtml(`
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Full Stack Software Engineer",
          "hiringOrganization": { "name": "Netflix" },
          "description": "<p>The range for this role is $250,000.00 - $413,000.00. This compensation range will vary based on location.</p>"
        }
      </script>
    `);

    expect(parsed).toMatchObject({
      method: "json-ld",
      salaryMin: 250000,
      salaryMax: 413000,
      salaryCurrency: "USD",
    });
  });

  it("resolves discovered page icons against the posting URL", () => {
    const parsed = parseHtml(
      `
        <link rel="icon" href="/brand/favicon.png">
        <main>
          <h1>Staff Engineer</h1>
          <section class="description">Make the hard parts kinder.</section>
        </main>
      `,
      new URL("https://jobs.example.com/careers/123"),
    );

    expect(parsed).toMatchObject({
      method: "static-html",
      companyLogoUrl: "https://jobs.example.com/brand/favicon.png",
    });
  });

  it("extracts simple salary ranges from static posting text", () => {
    const parsed = parseHtml(`
      <main>
        <h1>Staff Engineer</h1>
        <section class="description">
          The base salary range for this position is: $190,000 - $267,000 USD
        </section>
      </main>
    `);

    expect(parsed).toMatchObject({
      salaryMin: 190000,
      salaryMax: 267000,
      salaryCurrency: "USD",
    });
  });

  it("extracts decimal salary ranges from static posting text", () => {
    const parsed = parseHtml(`
      <main>
        <h1>Staff Engineer</h1>
        <section class="description">
          The range for this role is $250,000.00 - $413,000.00.
        </section>
      </main>
    `);

    expect(parsed).toMatchObject({
      salaryMin: 250000,
      salaryMax: 413000,
      salaryCurrency: "USD",
    });
  });
});
