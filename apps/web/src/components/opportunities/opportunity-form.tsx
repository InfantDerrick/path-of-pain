"use client";

import { workplaceTypes } from "@jobtracker/domain";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { workplaceLabels } from "@/lib/format";

const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-background px-3 outline-none ring-accent/30 transition focus:ring-2";

export function OpportunityForm({
  autoEnrichDefault = true,
  showEnrichOption = false,
}: {
  autoEnrichDefault?: boolean;
  showEnrichOption?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [workplaceType, setWorkplaceType] =
    useState<(typeof workplaceTypes)[number]>("UNKNOWN");
  const [compensation, setCompensation] = useState("");
  const [notes, setNotes] = useState("");
  const [applied, setApplied] = useState(false);
  const [autoEnrich, setAutoEnrich] = useState(autoEnrichDefault);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setExistingId(null);

    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        companyName,
        location,
        sourceUrl,
        workplaceType,
        compensation,
        notes,
        intent: applied ? "APPLY" : "SAVE",
        autoEnrich,
      }),
    });

    const payload = (await response.json()) as {
      id?: string;
      error?: string;
      existingId?: string;
    };

    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not save this role.");
      setExistingId(payload.existingId ?? null);
      return;
    }

    router.push(`/applications/${payload.id}`);
    router.refresh();
  }

  async function pasteJobUrl() {
    if (!navigator.clipboard?.readText) {
      setClipboardMessage("Clipboard paste is blocked here.");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      setSourceUrl(text.trim());
      setClipboardMessage("Pasted.");
    } catch {
      setClipboardMessage("Clipboard paste is blocked here.");
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Company</span>
        <input
          className={fieldClass}
          required
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Acme"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <input
          className={fieldClass}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Staff engineer"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Location</span>
        <input
          className={fieldClass}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Remote, NYC, or hybrid"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Workplace</span>
        <select
          className={fieldClass}
          value={workplaceType}
          onChange={(event) =>
            setWorkplaceType(
              event.target.value as (typeof workplaceTypes)[number],
            )
          }
        >
          {workplaceTypes.map((type) => (
            <option key={type} value={type}>
              {workplaceLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Compensation</span>
        <input
          className={fieldClass}
          value={compensation}
          onChange={(event) => setCompensation(event.target.value)}
          placeholder="Optional, e.g. 180-210k"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Job URL</span>
        <span className="flex gap-2">
          <input
            className={fieldClass}
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://..."
          />
          <button
            className="h-11 rounded-lg border border-line px-3 text-sm text-muted"
            type="button"
            onClick={() => void pasteJobUrl()}
          >
            Paste
          </button>
        </span>
        {clipboardMessage ? (
          <span className="text-xs text-muted">{clipboardMessage}</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Notes</span>
        <textarea
          className="min-h-28 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none ring-accent/30 transition focus:ring-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="How you found it, who referred you, warning signs, faint hope"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={applied}
          onChange={(event) => setApplied(event.target.checked)}
        />
        I already applied
      </label>
      {showEnrichOption ? (
        <label className="flex items-start gap-2 rounded-lg border border-line bg-background p-3 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={autoEnrich}
            onChange={(event) => setAutoEnrich(event.target.checked)}
          />
          <span>
            <span className="block font-medium">Enrich after saving</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              Optional if you included a URL. Leave it off for a purely
              hand-labeled scrap.
            </span>
          </span>
        </label>
      ) : null}
      {error ? (
        <p className="text-sm text-danger">
          {error}
          {existingId ? (
            <>
              {" "}
              <a className="underline" href={`/applications/${existingId}`}>
                Open it
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <button
        className="h-11 rounded-lg bg-accent font-medium text-accent-foreground disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Saving..." : "Save opportunity"}
      </button>
    </form>
  );
}
