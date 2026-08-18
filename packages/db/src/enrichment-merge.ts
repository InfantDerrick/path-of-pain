import type { WorkplaceType } from "@jobtracker/domain";
import type { ExtractedJob } from "@jobtracker/job-parser";

export const URL_ONLY_TITLE = "Untitled role";
export const UNKNOWN_COMPANY = "Unknown company";
const ATS_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
]);

export type ExistingEnrichmentFields = {
  title: string;
  companyName: string;
  location: string | null;
  workplaceType: string;
  compensation: string | null;
  descriptionText: string | null;
  sourceUrl: string | null;
};

export function companyNameFromUrl(value: string | null) {
  if (!value) {
    return UNKNOWN_COMPANY;
  }
  try {
    const url = new URL(value);
    const atsCompany = companyNameFromAtsUrl(url);
    if (atsCompany) {
      return atsCompany;
    }
    return url.hostname.replace(/^www\./, "");
  } catch {
    return UNKNOWN_COMPANY;
  }
}

function titleizeSlug(value: string | undefined) {
  if (!value) {
    return null;
  }
  const words = value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return null;
  }
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function companyNameFromAtsUrl(url: URL) {
  if (
    url.hostname === "boards.greenhouse.io" ||
    url.hostname === "job-boards.greenhouse.io"
  ) {
    return titleizeSlug(
      url.pathname.split("/").filter(Boolean)[0] ??
        url.searchParams.get("for") ??
        undefined,
    );
  }
  if (url.hostname === "jobs.lever.co" || url.hostname === "jobs.ashbyhq.com") {
    return titleizeSlug(url.pathname.split("/").filter(Boolean)[0]);
  }
  return null;
}

function legacyCompanyNameFromUrl(value: string | null) {
  if (!value) {
    return UNKNOWN_COMPANY;
  }
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return UNKNOWN_COMPANY;
  }
}

function isAtsHostPlaceholder(value: string, sourceUrl: string | null) {
  try {
    const hostname = new URL(sourceUrl ?? "").hostname.replace(/^www\./, "");
    return ATS_HOSTS.has(hostname) && value.toLowerCase() === hostname;
  } catch {
    return false;
  }
}

export function shouldReplaceTitle(value: string) {
  return value === URL_ONLY_TITLE;
}

export function shouldReplaceCompany(value: string, sourceUrl: string | null) {
  return (
    value === UNKNOWN_COMPANY ||
    value === companyNameFromUrl(sourceUrl) ||
    value === legacyCompanyNameFromUrl(sourceUrl) ||
    isAtsHostPlaceholder(value, sourceUrl)
  );
}

export function shouldReplaceOptional(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

export function shouldReplaceWorkplace(value: string | null | undefined) {
  return !value || value === "UNKNOWN";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatExtractedCompensation(extracted: ExtractedJob) {
  if (!extracted.salaryMin && !extracted.salaryMax) {
    return null;
  }
  const currency = extracted.salaryCurrency ?? "USD";
  if (extracted.salaryMin && extracted.salaryMax) {
    return `$${formatMoney(extracted.salaryMin)} - $${formatMoney(
      extracted.salaryMax,
    )} ${currency}`;
  }
  const amount = extracted.salaryMin ?? extracted.salaryMax;
  return amount ? `$${formatMoney(amount)} ${currency}` : null;
}

export function buildEnrichmentMerge(
  existing: ExistingEnrichmentFields,
  extracted: ExtractedJob,
) {
  const compensation = formatExtractedCompensation(extracted);
  return {
    title:
      extracted.title && shouldReplaceTitle(existing.title)
        ? extracted.title
        : existing.title,
    companyName:
      extracted.company &&
      shouldReplaceCompany(existing.companyName, existing.sourceUrl)
        ? extracted.company
        : existing.companyName,
    location:
      extracted.location && shouldReplaceOptional(existing.location)
        ? extracted.location
        : existing.location,
    workplaceType:
      extracted.workplaceType && shouldReplaceWorkplace(existing.workplaceType)
        ? extracted.workplaceType
        : (existing.workplaceType as WorkplaceType),
    compensation:
      compensation && shouldReplaceOptional(existing.compensation)
        ? compensation
        : existing.compensation,
    descriptionText:
      extracted.descriptionText &&
      shouldReplaceOptional(existing.descriptionText)
        ? extracted.descriptionText
        : existing.descriptionText,
  };
}
