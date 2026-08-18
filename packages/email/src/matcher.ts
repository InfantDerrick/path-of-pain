import {
  collectCompanyDomains,
  domainFromUrl,
  domainRoot,
  domainsRelated,
  normalizeDomain,
} from "./domains";
import { tokenize } from "./normalize";
import type {
  ExtractedEmailMetadata,
  OpportunityMatch,
  OpportunityMatchTarget,
} from "./types";

function overlapScore(source: string[], target: string[], points: number) {
  const targetSet = new Set(target);
  const matches = source.filter((token) => targetSet.has(token));
  return {
    score: Math.min(points, matches.length * Math.ceil(points / 3)),
    matches,
  };
}

function scoreDomainOverlap(
  metadata: ExtractedEmailMetadata,
  companyDomains: string[],
) {
  let score = 0;
  const reasons: string[] = [];
  const fromDomain = normalizeDomain(metadata.fromDomain);
  const emailDomains = Array.from(
    new Set([fromDomain, ...metadata.domains].filter(Boolean)),
  ) as string[];

  for (const companyDomain of companyDomains) {
    if (fromDomain && domainsRelated(fromDomain, companyDomain)) {
      score += 40;
      reasons.push(`Sender domain matches ${companyDomain}`);
      break;
    }
  }

  for (const companyDomain of companyDomains) {
    const linkMatch = emailDomains.find((domain) =>
      domainsRelated(domain, companyDomain),
    );
    if (linkMatch && linkMatch !== fromDomain) {
      score += 25;
      reasons.push(`Email links mention ${companyDomain}`);
      break;
    }
  }

  return { score, reasons };
}

export function matchOpportunities(
  metadata: ExtractedEmailMetadata,
  opportunities: OpportunityMatchTarget[],
) {
  const allTokens = Array.from(
    new Set([...metadata.subjectTokens, ...metadata.bodyTokens]),
  );

  const matches = opportunities.map<OpportunityMatch>((target) => {
    let score = 0;
    const reasons: string[] = [];
    const companyDomains = collectCompanyDomains({
      companyDomain: target.companyDomain,
      sourceUrl: target.sourceUrl,
    });

    const domainOverlap = scoreDomainOverlap(metadata, companyDomains);
    score += domainOverlap.score;
    reasons.push(...domainOverlap.reasons);

    const companyInSubject = overlapScore(
      tokenize(target.companyName),
      metadata.subjectTokens,
      22,
    );
    if (companyInSubject.score > 0) {
      score += companyInSubject.score;
      reasons.push(
        `Company mentioned in subject: ${companyInSubject.matches.join(", ")}`,
      );
    }

    const companyOverlap = overlapScore(
      tokenize(target.companyName),
      allTokens,
      20,
    );
    if (companyOverlap.score > 0) {
      score += companyOverlap.score;
      reasons.push(`Company token match: ${companyOverlap.matches.join(", ")}`);
    }

    const titleOverlap = overlapScore(tokenize(target.title), allTokens, 16);
    if (titleOverlap.score > 0) {
      score += titleOverlap.score;
      reasons.push(`Title token match: ${titleOverlap.matches.join(", ")}`);
    }

    return {
      opportunityId: target.id,
      score: Math.min(100, score),
      reasons,
    };
  });

  return matches
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function chooseBestMatch(matches: OpportunityMatch[]) {
  const [best, second] = matches;
  if (!best) {
    return null;
  }
  if (best.score < 30) {
    return null;
  }

  const hasNonDomainReason = best.reasons.some(
    (reason) =>
      reason.startsWith("Company mentioned in subject:") ||
      reason.startsWith("Company token match:") ||
      reason.startsWith("Title token match:"),
  );
  if (best.score < 45 && !hasNonDomainReason) {
    return null;
  }

  if (second && best.score - second.score < 8) {
    return best.score >= 42 ? best : null;
  }
  return best;
}

export {
  collectCompanyDomains,
  domainFromUrl,
  domainsRelated,
  domainRoot,
  normalizeDomain,
};
