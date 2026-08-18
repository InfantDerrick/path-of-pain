"use client";

import { cn } from "@jobtracker/ui";
import { Flame, MailWarning, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatRelativeTime } from "@/lib/format";

type EmailSuggestion = {
  id: string;
  type: string;
  confidence: number;
  summary: string;
  evidence: string[];
  matchReasons: string[];
  createdAt: Date;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  fromDomain: string | null;
  subject: string | null;
  receivedAt: Date;
};

function labelForType(type: string) {
  const labels: Record<string, string> = {
    application_received: "Application receipt",
    assessment: "Assessment",
    interview_request: "Interview signal",
    offer: "Offer signal",
    rejection: "Possible rejection",
    follow_up: "Follow-up",
  };
  return labels[type] ?? "Email signal";
}

function confirmLabel(type: string) {
  const labels: Record<string, string> = {
    application_received: "Mark received",
    assessment: "Add ordeal",
    interview_request: "Add interview",
    offer: "Record offer",
    rejection: "Write it",
  };
  return labels[type] ?? "Confirm";
}

export function EmailSuggestionCard({
  suggestion,
}: {
  suggestion: EmailSuggestion;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resolve(action: "confirm" | "ignore" | "wrong-job") {
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/email/suggestions/${suggestion.id}/${action}`,
        { method: "POST" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Could not settle this signal.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_18px_50px_-38px_var(--shadow-soft)]">
      <button
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-background/40"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
          <MailWarning className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Something moved
          </span>
          <span className="mt-1 block text-sm font-semibold text-foreground">
            {labelForType(suggestion.type)} from{" "}
            {suggestion.fromDomain ?? suggestion.companyName}
          </span>
          <span className="mt-1 block truncate text-xs text-muted">
            {suggestion.companyName} · {suggestion.opportunityTitle}
          </span>
        </span>
        <span className="rounded-full border border-line bg-background px-2 py-1 text-xs text-muted">
          {suggestion.confidence}%
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-line bg-background/30 p-4">
          <div className="rounded-lg border border-line bg-panel-soft/80 p-3">
            <div className="flex items-start gap-2">
              <Flame className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium">{suggestion.summary}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Received {formatRelativeTime(suggestion.receivedAt)}
                  {suggestion.subject ? ` · ${suggestion.subject}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Evidence
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestion.evidence.map((item) => (
                  <span
                    className="rounded-full border border-line bg-panel px-2 py-1 text-xs text-muted"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Match
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestion.matchReasons.map((item) => (
                  <span
                    className="rounded-full border border-line bg-panel px-2 py-1 text-xs text-muted"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-3 text-sm font-medium text-foreground"
              href={`/applications/${suggestion.opportunityId}`}
            >
              Open role
            </Link>
            <button
              className={cn(
                "h-10 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-60",
              )}
              disabled={pending}
              onClick={() => resolve("confirm")}
              type="button"
            >
              {confirmLabel(suggestion.type)}
            </button>
            <button
              className="h-10 rounded-lg border border-line bg-panel px-3 text-sm font-medium text-muted disabled:opacity-60"
              disabled={pending}
              onClick={() => resolve("wrong-job")}
              type="button"
            >
              Wrong job
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-3 text-sm font-medium text-muted disabled:opacity-60"
              disabled={pending}
              onClick={() => resolve("ignore")}
              type="button"
            >
              <X className="mr-1.5 size-4" />
              Ignore
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
