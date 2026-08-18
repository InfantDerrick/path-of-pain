"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";

type Mode = "auto" | "manual";
type EnrichState =
  | "idle"
  | "saving"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

const enrichCopy: Record<EnrichState, string> = {
  idle: "Paste the posting. We’ll pull out what matters and leave the noise behind.",
  saving: "Saving the role...",
  queued: "Queued. We’re getting the page into focus.",
  running:
    "Reading salary ranges, logos, and the fine print that usually hides in plain sight.",
  succeeded: "Enriched. This one has shape now.",
  failed: "Saved, but enrichment couldn’t make sense of the page.",
};

export function AddPainFlow() {
  const [mode, setMode] = useState<Mode>("auto");

  return (
    <div>
      <div className="mx-auto grid max-w-md grid-cols-2 rounded-lg border border-line bg-panel p-1 text-sm">
        {(["auto", "manual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`h-10 rounded-md capitalize transition ${
              mode === option
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() => setMode(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {mode === "auto" ? (
        <AutoEnrichCapture />
      ) : (
        <section className="mx-auto mt-6 max-w-xl rounded-lg border border-line bg-panel p-5 shadow-[0_18px_60px_-42px_var(--shadow-soft)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Manual entry</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Fill the fields yourself. Add a URL only if you want an optional
              enrichment pass after saving. Some things are clearer when you
              write them down yourself.
            </p>
          </div>
          <OpportunityForm autoEnrichDefault={false} showEnrichOption />
        </section>
      )}
    </div>
  );
}

function AutoEnrichCapture() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [state, setState] = useState<EnrichState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [clipboardState, setClipboardState] = useState<
    "idle" | "reading" | "unavailable"
  >("idle");

  const step = useMemo(() => {
    if (state === "idle") {
      return 0;
    }
    if (state === "saving") {
      return 1;
    }
    if (state === "queued") {
      return 2;
    }
    if (state === "running") {
      return 3;
    }
    return 4;
  }, [state]);

  useEffect(() => {
    if (!opportunityId || state === "succeeded" || state === "failed") {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}`);
      if (!response.ok || cancelled) {
        return;
      }
      const payload = (await response.json()) as {
        enrichmentStatus?: string;
        enrichmentError?: string | null;
      };
      if (payload.enrichmentStatus === "RUNNING") {
        setState("running");
      }
      if (payload.enrichmentStatus === "SUCCEEDED") {
        setState("succeeded");
        window.clearInterval(interval);
        window.setTimeout(() => {
          router.push(`/applications/${opportunityId}`);
          router.refresh();
        }, 900);
      }
      if (payload.enrichmentStatus === "FAILED") {
        setState("failed");
        setError(payload.enrichmentError ?? "Enrichment failed.");
        window.clearInterval(interval);
      }
    }, 1100);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [opportunityId, router, state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceUrl.trim() || state !== "idle") {
      return;
    }

    setState("saving");
    setError(null);
    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceUrl,
        intent: "SAVE",
        autoEnrich: true,
      }),
    });
    const payload = (await response.json()) as {
      id?: string;
      error?: string;
      existingId?: string;
      enrichmentStatus?: string;
    };

    if (!response.ok) {
      if (payload.existingId) {
        router.push(`/applications/${payload.existingId}`);
        return;
      }
      setState("idle");
      setError(payload.error ?? "Could not save this URL.");
      return;
    }

    setOpportunityId(payload.id ?? null);
    setState(payload.enrichmentStatus === "RUNNING" ? "running" : "queued");
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setClipboardState("unavailable");
      return;
    }
    setClipboardState("reading");
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      setSourceUrl(text.trim());
      setClipboardState("idle");
    } catch {
      setClipboardState("unavailable");
    }
  }

  return (
    <section className="mx-auto mt-10 flex min-h-[28rem] max-w-2xl flex-col items-center justify-center text-center">
      <div className="relative mb-7 size-32">
        <div className="add-pain-orbit absolute inset-0 rounded-full border border-accent/25" />
        <div className="add-pain-orbit add-pain-orbit-late absolute inset-3 rounded-full border border-line" />
        <div className="absolute inset-8 rounded-xl border border-line bg-panel shadow-[0_18px_60px_-40px_var(--shadow-soft)]" />
        <div className="add-pain-stamp absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-sm font-semibold text-accent">
          {step}/4
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Add role</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        {enrichCopy[state]}
      </p>

      <form
        className="mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={onSubmit}
      >
        <input
          aria-label="Job URL"
          className="h-12 min-w-0 rounded-lg border border-line bg-panel px-4 text-sm outline-none ring-accent/30 transition focus:ring-2"
          type="url"
          value={sourceUrl}
          disabled={state !== "idle"}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://company.example/jobs/role"
        />
        <button
          className="h-12 rounded-lg border border-line bg-panel px-4 text-sm font-medium text-muted transition hover:text-foreground disabled:opacity-60"
          type="button"
          disabled={state !== "idle" || clipboardState === "reading"}
          onClick={() => void pasteFromClipboard()}
        >
          {clipboardState === "reading" ? "Reading" : "Paste"}
        </button>
        <button
          className="h-12 rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          type="submit"
          disabled={state !== "idle"}
        >
          {state === "idle" ? "Enrich" : "Working"}
        </button>
      </form>

      <div className="mt-6 grid w-full max-w-xl grid-cols-4 gap-2 text-left">
        {["Save", "Queue", "Read", "Shape"].map((label, index) => (
          <div
            key={label}
            className={`rounded-lg border px-3 py-2 text-xs transition ${
              step > index
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line bg-panel-soft text-muted"
            }`}
          >
            <span className="block font-medium">{label}</span>
            <span className="mt-1 block opacity-80">
              {step > index ? "Done" : "Waiting"}
            </span>
          </div>
        ))}
      </div>

      {state === "failed" && opportunityId ? (
        <a
          className="mt-5 text-sm font-medium text-accent underline"
          href={`/applications/${opportunityId}`}
        >
          Open saved role
        </a>
      ) : null}
      {clipboardState === "unavailable" ? (
        <p className="mt-4 text-sm text-muted">
          Clipboard paste is blocked here. Long-press paste still works.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
