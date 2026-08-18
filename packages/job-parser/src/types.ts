export type WorkplaceType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";

export type ExtractionInput = {
  url: URL;
  html?: string;
};

export type ExtractedJob = {
  company?: string;
  title?: string;
  location?: string;
  workplaceType?: WorkplaceType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  descriptionHtml?: string;
  descriptionText?: string;
  externalJobId?: string;
  employmentType?: string;
  confidence: Record<string, number>;
};

export type JobSourceAdapter = {
  id: string;
  matches(url: URL): boolean;
  extract(input: ExtractionInput): Promise<ExtractedJob>;
};
