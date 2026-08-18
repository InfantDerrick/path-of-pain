"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const activeStatuses = new Set(["QUEUED", "RUNNING"]);

export function EnrichmentStatus({
  opportunityId,
  status,
  error,
}: {
  opportunityId: string;
  status: string | null;
  error: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!status || !activeStatuses.has(status)) {
      return;
    }
    const interval = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(interval);
  }, [router, status]);

  async function reprocess() {
    setPending(true);
    await fetch(`/api/opportunities/${opportunityId}/reprocess`, {
      method: "POST",
    });
    setPending(false);
    router.refresh();
  }

  if (!status || status === "IDLE") {
    return null;
  }

  const label =
    status === "SUCCEEDED"
      ? "Posting decoded"
      : status === "FAILED"
        ? "Parser stalled"
        : "Reading the posting";

  return (
    <section className="mt-4 rounded-lg border border-line bg-panel px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {error ? (
            <p className="mt-1 text-sm text-danger">{error}</p>
          ) : status === "SUCCEEDED" ? (
            <p className="mt-1 text-sm text-muted">
              Title, company, and posting details were filled in where the page
              gave us something useful.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Reading the page for the details that matter.
            </p>
          )}
        </div>
        {status === "FAILED" ? (
          <button
            className="h-9 rounded-lg border border-line px-3 text-sm font-medium disabled:opacity-60"
            type="button"
            onClick={reprocess}
            disabled={pending}
          >
            {pending ? "Queued" : "Retry"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
