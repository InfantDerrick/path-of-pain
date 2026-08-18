export function normalizeDomain(value: string | null | undefined) {
  return value?.replace(/^www\./, "").toLowerCase() ?? null;
}

export function domainFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return null;
  }
}

/** Deterministic registrable-ish root for subdomain matching (roblox.com, careers.roblox.com). */
export function domainRoot(domain: string) {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    return null;
  }
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return normalized;
  }
  return parts.slice(-2).join(".");
}

export function domainsRelated(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const a = normalizeDomain(left);
  const b = normalizeDomain(right);
  if (!a || !b) {
    return false;
  }
  if (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) {
    return true;
  }
  const rootA = domainRoot(a);
  const rootB = domainRoot(b);
  return Boolean(rootA && rootB && rootA === rootB);
}

export function collectCompanyDomains(target: {
  companyDomain: string | null;
  sourceUrl: string | null;
}) {
  return Array.from(
    new Set(
      [target.companyDomain, domainFromUrl(target.sourceUrl)]
        .map((value) => normalizeDomain(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
