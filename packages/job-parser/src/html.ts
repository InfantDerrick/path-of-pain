import * as cheerio from "cheerio";
import type { ExtractedJob } from "./types";

function asText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (Array.isArray(value)) {
    return value.map(asText).find(Boolean);
  }
  return undefined;
}

function parsePipedMetaTitle(value: string | undefined) {
  if (!value?.includes("|")) {
    return {};
  }
  const [title, location, company] = value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return { title, location, company };
}

function findJobPosting(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((item) => String(item).toLowerCase() === "jobposting")) {
    return record;
  }

  return findJobPosting(record["@graph"]);
}

function absoluteUrl(value: string | undefined, pageUrl: URL | undefined) {
  if (!value) {
    return undefined;
  }
  try {
    return pageUrl
      ? new URL(value, pageUrl).toString()
      : new URL(value).toString();
  } catch {
    return undefined;
  }
}

function findIcon($: cheerio.CheerioAPI, pageUrl: URL | undefined) {
  const icon =
    $('link[rel~="apple-touch-icon"]').attr("href") ??
    $('link[rel~="icon"]').attr("href") ??
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="og:image"]').attr("content");
  return (
    absoluteUrl(icon, pageUrl) ??
    (pageUrl ? new URL("/favicon.ico", pageUrl).toString() : undefined)
  );
}

function numericSalary(value: string | undefined) {
  return value ? Number(value.replaceAll(",", "")) || undefined : undefined;
}

function findSalaryRange(value: string | undefined) {
  if (!value) {
    return {};
  }
  const match = value.match(
    /\$\s*([\d,]{2,})(?:\.\d+)?\s*(?:-|–|—|to)\s*\$?\s*([\d,]{2,})(?:\.\d+)?\s*(USD|CAD|EUR|GBP)?/i,
  );
  if (!match) {
    return {};
  }
  return {
    salaryMin: numericSalary(match[1]),
    salaryMax: numericSalary(match[2]),
    salaryCurrency: match[3]?.toUpperCase() ?? "USD",
  };
}

function parseJsonLd(
  $: cheerio.CheerioAPI,
  pageUrl: URL | undefined,
): ExtractedJob | undefined {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).text();
    try {
      const data = JSON.parse(raw) as unknown;
      const posting = findJobPosting(data);
      if (!posting) {
        continue;
      }
      const hiringOrganization = posting.hiringOrganization as
        | Record<string, unknown>
        | undefined;
      const jobLocation = Array.isArray(posting.jobLocation)
        ? (posting.jobLocation[0] as Record<string, unknown> | undefined)
        : (posting.jobLocation as Record<string, unknown> | undefined);
      const address = jobLocation?.address as
        | Record<string, unknown>
        | undefined;
      const location = [
        asText(address?.addressLocality),
        asText(address?.addressRegion),
        asText(address?.addressCountry),
      ]
        .filter(Boolean)
        .join(", ");
      const salary = posting.baseSalary as Record<string, unknown> | undefined;
      const value = salary?.value as Record<string, unknown> | undefined;
      const descriptionHtml = asText(posting.description);
      const textSalary = findSalaryRange(
        descriptionHtml ? cheerio.load(descriptionHtml).text() : undefined,
      );
      const meta = parsePipedMetaTitle(
        $('meta[property="og:title"]').attr("content") ??
          $('meta[name="og:title"]').attr("content"),
      );

      return {
        method: "json-ld",
        title: asText(posting.title) ?? meta.title,
        company: asText(hiringOrganization?.name) ?? meta.company,
        companyLogoUrl:
          absoluteUrl(asText(hiringOrganization?.logo), pageUrl) ??
          findIcon($, pageUrl),
        location: meta.location ?? location ?? asText(posting.jobLocationType),
        descriptionHtml,
        externalJobId: asText(posting.identifier),
        employmentType: asText(posting.employmentType),
        salaryMin: Number(value?.minValue) || textSalary.salaryMin,
        salaryMax: Number(value?.maxValue) || textSalary.salaryMax,
        salaryCurrency: asText(salary?.currency) ?? textSalary.salaryCurrency,
        confidence: { title: 90, company: 90, descriptionText: 90 },
      };
    } catch {}
  }
  return undefined;
}

function parseStaticHtml(
  $: cheerio.CheerioAPI,
  pageUrl: URL | undefined,
): ExtractedJob {
  const title =
    $('[data-automation-id="jobPostingHeader"] h1').first().text() ||
    $("h1").first().text() ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text();
  const company =
    $('[data-automation-id="company"]').first().text() ||
    $('meta[property="og:site_name"]').attr("content");
  const location =
    $('[data-automation-id="locations"]').first().text() ||
    $('[class*="location" i]').first().text();
  const description =
    $('[data-automation-id="jobPostingDescription"]').first().html() ||
    $('[class*="description" i]').first().html() ||
    $("main").first().html() ||
    $("body").html() ||
    undefined;
  const salary = findSalaryRange(
    cheerio.load(description ?? "").text() || $("body").text(),
  );

  return {
    method: "static-html",
    title,
    company,
    companyLogoUrl: findIcon($, pageUrl),
    location,
    descriptionHtml: description,
    ...salary,
    confidence: { title: 55, company: company ? 50 : 0, descriptionText: 45 },
  };
}

export function parseHtml(html: string, pageUrl?: URL): ExtractedJob {
  const $ = cheerio.load(html);
  return parseJsonLd($, pageUrl) ?? parseStaticHtml($, pageUrl);
}
