import * as cheerio from "cheerio";
import { parseHtml } from "./html";
import type { JobSourceAdapter } from "./types";

function getScriptJson(html: string, pattern: RegExp): unknown | undefined {
  const match = html.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

function fromRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function titleizeSlug(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const words = value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return undefined;
  }
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function greenhouseBoardToken(url: URL) {
  if (url.hostname === "boards.greenhouse.io") {
    return url.pathname.split("/").filter(Boolean)[0];
  }
  if (url.hostname === "job-boards.greenhouse.io") {
    return (
      url.pathname.split("/").filter(Boolean)[0] ??
      url.searchParams.get("for") ??
      undefined
    );
  }
  return url.searchParams.get("for") ?? undefined;
}

function companyFromLogoAlt(html: string | undefined) {
  if (!html) {
    return undefined;
  }
  const $ = cheerio.load(html);
  const alt = $("img[alt]")
    .toArray()
    .map((element) => text($(element).attr("alt")))
    .find((value) => value && /logo/i.test(value));
  return alt?.replace(/\s+logo\s*$/i, "").trim() || undefined;
}

function isGreenhousePlaceholder(value: string | undefined) {
  const normalized = value?.toLowerCase().trim() ?? "";
  return (
    !normalized ||
    normalized === "greenhouse" ||
    normalized === "job board" ||
    normalized === "job boards" ||
    normalized === "job-boards.greenhouse.io" ||
    normalized === "boards.greenhouse.io"
  );
}

function greenhouseJobId(url: URL) {
  const [, jobs, id] = url.pathname.match(/\/(jobs|job_app)\/([^/?#]+)/) ?? [];
  return jobs ? id : undefined;
}

export const greenhouseAdapter: JobSourceAdapter = {
  id: "greenhouse",
  matches(url) {
    return (
      /(^|\.)greenhouse\.io$/.test(url.hostname) ||
      url.pathname.includes("/greenhouse/")
    );
  },
  async extract({ html, url }) {
    const generic = parseHtml(html ?? "", url);
    const inferredCompany =
      companyFromLogoAlt(html) ?? titleizeSlug(greenhouseBoardToken(url));
    return {
      ...generic,
      company: isGreenhousePlaceholder(generic.company)
        ? inferredCompany
        : generic.company,
      externalJobId: generic.externalJobId ?? greenhouseJobId(url),
      method: "greenhouse",
      confidence: { ...generic.confidence, company: 75, title: 75 },
    };
  },
};

export const leverAdapter: JobSourceAdapter = {
  id: "lever",
  matches(url) {
    return (
      /(^|\.)lever\.co$/.test(url.hostname) ||
      url.hostname.includes("jobs.lever.co")
    );
  },
  async extract({ html, url }) {
    const data = getScriptJson(
      html ?? "",
      /window\.__POSTING__\s*=\s*({[\s\S]*?});/,
    );
    const posting = fromRecord(data);
    if (posting) {
      const categories = fromRecord(posting.categories);
      return {
        method: "lever",
        title: text(posting.text),
        company: text(posting.company),
        location: text(categories?.location),
        employmentType: text(categories?.commitment),
        descriptionHtml:
          text(posting.description) ?? text(posting.descriptionPlain),
        externalJobId: text(posting.id),
        confidence: { title: 90, company: 75, descriptionText: 80 },
      };
    }
    const generic = parseHtml(html ?? "", url);
    return { ...generic, method: "lever" };
  },
};

export const ashbyAdapter: JobSourceAdapter = {
  id: "ashby",
  matches(url) {
    return (
      /(^|\.)ashbyhq\.com$/.test(url.hostname) ||
      url.hostname.includes("jobs.ashbyhq.com")
    );
  },
  async extract({ html, url }) {
    const generic = parseHtml(html ?? "", url);
    return { ...generic, method: "ashby" };
  },
};

export const adapters: JobSourceAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
];
