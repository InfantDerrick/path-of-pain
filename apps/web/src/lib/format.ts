export function formatRelativeTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < 0) {
    const aheadMs = Math.abs(diffMs);
    if (aheadMs < hour) {
      return "soon";
    }
    if (aheadMs < day) {
      return `in ${Math.ceil(aheadMs / hour)}h`;
    }
    return `in ${Math.ceil(aheadMs / day)}d`;
  }

  if (diffMs < minute) {
    return "just now";
  }
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffMs / day);
  if (days < 14) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const workplaceLabels = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
  UNKNOWN: "Unknown",
} as const;
