import type { ExtractedJob, WorkplaceType } from "./types";

function cleanText(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function stripHtml(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  return cleanText(value.replace(/<[^>]*>/g, " "));
}

function normalizeWorkplace(
  value: string | undefined,
): WorkplaceType | undefined {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("remote")) {
    return "REMOTE";
  }
  if (normalized.includes("hybrid")) {
    return "HYBRID";
  }
  if (normalized.includes("onsite") || normalized.includes("on-site")) {
    return "ONSITE";
  }
  return undefined;
}

export function normalizeExtractedJob(job: ExtractedJob): ExtractedJob {
  const descriptionHtml = job.descriptionHtml?.trim() || undefined;
  const descriptionText =
    cleanText(job.descriptionText) ?? stripHtml(descriptionHtml);

  return {
    ...job,
    company: cleanText(job.company),
    companyLogoUrl: cleanText(job.companyLogoUrl),
    title: cleanText(job.title),
    location: cleanText(job.location),
    workplaceType:
      job.workplaceType ??
      normalizeWorkplace(`${job.location ?? ""} ${descriptionText ?? ""}`),
    descriptionHtml,
    descriptionText,
    externalJobId: cleanText(job.externalJobId),
    employmentType: cleanText(job.employmentType),
    salaryCurrency: cleanText(job.salaryCurrency),
    confidence: job.confidence ?? {},
  };
}
