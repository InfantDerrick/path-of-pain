import { tokenize } from "./normalize";
import type {
  ExtractedEmailMetadata,
  OpportunityMatch,
  OpportunityMatchTarget,
} from "./types";

function normalizedDomain(value: string | null) {
  return value?.replace(/^www\./, "").toLowerCase() ?? null;
}

function domainFromUrl(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function overlapScore(source: string[], target: string[], points: number) {
  const targetSet = new Set(target);
  const matches = source.filter((token) => targetSet.has(token));
  return {
    score: Math.min(points, matches.length * Math.ceil(points / 3)),
    matches,
  };
}

export function matchOpportunities(
  metadata: ExtractedEmailMetadata,
  opportunities: OpportunityMatchTarget[],
) {
  const allTokens = Array.from(
    new Set([...metadata.subjectTokens, ...metadata.bodyTokens]),
  );
  const fromDomain = normalizedDomain(metadata.fromDomain);

  const matches = opportunities.map<OpportunityMatch>((target) => {
    let score = 0;
    const reasons: string[] = [];
    const companyDomain =
      normalizedDomain(target.companyDomain) ?? domainFromUrl(target.sourceUrl);

    if (fromDomain && companyDomain && fromDomain.endsWith(companyDomain)) {
      score += 40;
      reasons.push(`Sender domain matches ${companyDomain}`);
    }
    if (companyDomain && metadata.domains.includes(companyDomain)) {
      score += 25;
      reasons.push(`Email links mention ${companyDomain}`);
    }

    const companyOverlap = overlapScore(
      tokenize(target.companyName),
      allTokens,
      24,
    );
    if (companyOverlap.score > 0) {
      score += companyOverlap.score;
      reasons.push(`Company token match: ${companyOverlap.matches.join(", ")}`);
    }

    const titleOverlap = overlapScore(tokenize(target.title), allTokens, 18);
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
    .filter((match) => match.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function chooseBestMatch(matches: OpportunityMatch[]) {
  const [best, second] = matches;
  if (!best) {
    return null;
  }
  if (second && best.score - second.score < 10) {
    return null;
  }
  return best.score >= 55 ? best : null;
}
