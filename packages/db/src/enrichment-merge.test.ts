import { describe, expect, it } from "vitest";
import { buildEnrichmentMerge } from "./enrichment-merge";

describe("buildEnrichmentMerge", () => {
  it("fills placeholders from parser output", () => {
    expect(
      buildEnrichmentMerge(
        {
          title: "Untitled role",
          companyName: "jobs.lever.co",
          location: null,
          workplaceType: "UNKNOWN",
          compensation: null,
          descriptionText: null,
          sourceUrl: "https://jobs.lever.co/acme/123",
        },
        {
          title: "Staff Engineer",
          company: "Acme",
          location: "Remote",
          workplaceType: "REMOTE",
          descriptionText: "Build careful software.",
          confidence: {},
        },
      ),
    ).toMatchObject({
      title: "Staff Engineer",
      companyName: "Acme",
      location: "Remote",
      workplaceType: "REMOTE",
      compensation: null,
      descriptionText: "Build careful software.",
    });
  });

  it("infers ATS company names from board URLs", () => {
    expect(
      buildEnrichmentMerge(
        {
          title: "Untitled role",
          companyName: "Reddit",
          location: null,
          workplaceType: "UNKNOWN",
          compensation: null,
          descriptionText: null,
          sourceUrl:
            "https://job-boards.greenhouse.io/reddit/jobs/8024892?gh_src=nvi955tz1us",
        },
        {
          title: "Senior Software Engineer, Presence",
          company: "Reddit",
          location: "Remote - United States",
          workplaceType: "REMOTE",
          salaryMin: 190000,
          salaryMax: 267000,
          salaryCurrency: "USD",
          descriptionText: "Build community systems.",
          confidence: {},
        },
      ),
    ).toMatchObject({
      companyName: "Reddit",
      title: "Senior Software Engineer, Presence",
      compensation: "$190,000 - $267,000 USD",
    });
  });

  it("repairs legacy ATS host placeholders", () => {
    expect(
      buildEnrichmentMerge(
        {
          title: "Untitled role",
          companyName: "job-boards.greenhouse.io",
          location: null,
          workplaceType: "UNKNOWN",
          compensation: null,
          descriptionText: null,
          sourceUrl:
            "https://job-boards.greenhouse.io/reddit/jobs/8024892?gh_src=nvi955tz1us",
        },
        {
          title: "Senior Software Engineer, Presence",
          company: "Reddit",
          location: "Remote - United States",
          workplaceType: "REMOTE",
          descriptionText: "Build community systems.",
          confidence: {},
        },
      ),
    ).toMatchObject({
      companyName: "Reddit",
    });
  });

  it("formats Netflix-style decimal salary ranges for display", () => {
    expect(
      buildEnrichmentMerge(
        {
          title: "Untitled role",
          companyName: "Netflix",
          location: null,
          workplaceType: "UNKNOWN",
          compensation: null,
          descriptionText: null,
          sourceUrl: "https://explore.jobs.netflix.net/careers/job/123",
        },
        {
          title: "Software Engineer",
          company: "Netflix",
          salaryMin: 250000,
          salaryMax: 413000,
          salaryCurrency: "USD",
          confidence: {},
        },
      ),
    ).toMatchObject({
      compensation: "$250,000 - $413,000 USD",
    });
  });

  it("does not clobber user-entered fields", () => {
    expect(
      buildEnrichmentMerge(
        {
          title: "My custom title",
          companyName: "Acme Careers",
          location: "New York",
          workplaceType: "HYBRID",
          compensation: "$1 and a commemorative mug",
          descriptionText: "User pasted text.",
          sourceUrl: "https://jobs.ashbyhq.com/acme/123",
        },
        {
          title: "Staff Engineer",
          company: "Acme",
          location: "Remote",
          workplaceType: "REMOTE",
          salaryMin: 100000,
          salaryMax: 120000,
          salaryCurrency: "USD",
          descriptionText: "Parser text.",
          confidence: {},
        },
      ),
    ).toMatchObject({
      title: "My custom title",
      companyName: "Acme Careers",
      location: "New York",
      workplaceType: "HYBRID",
      compensation: "$1 and a commemorative mug",
      descriptionText: "User pasted text.",
    });
  });
});
