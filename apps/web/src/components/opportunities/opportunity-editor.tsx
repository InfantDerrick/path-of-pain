"use client";

import { workplaceTypes } from "@jobtracker/domain";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { workplaceLabels } from "@/lib/format";

const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-background px-3 outline-none ring-accent/30 transition focus:ring-2";

type OpportunityEditorProps = {
  opportunity: {
    id: string;
    title: string;
    companyName: string;
    companyLogoUrl: string | null;
    location: string | null;
    workplaceType: string;
    compensation: string | null;
    sourceUrl: string | null;
    descriptionText: string | null;
  };
};

export function OpportunityEditor({ opportunity }: OpportunityEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(opportunity.title);
  const [companyName, setCompanyName] = useState(opportunity.companyName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(
    opportunity.companyLogoUrl ?? "",
  );
  const [location, setLocation] = useState(opportunity.location ?? "");
  const [sourceUrl, setSourceUrl] = useState(opportunity.sourceUrl ?? "");
  const [workplaceType, setWorkplaceType] = useState(opportunity.workplaceType);
  const [compensation, setCompensation] = useState(
    opportunity.compensation ?? "",
  );
  const [descriptionText, setDescriptionText] = useState(
    opportunity.descriptionText ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const response = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        companyName,
        companyLogoUrl,
        location,
        sourceUrl,
        workplaceType,
        compensation,
        descriptionText,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not save changes.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function discard() {
    const confirmed = window.confirm(
      "Discard this role? It leaves your main view, but the record can still be opened directly if you have the link.",
    );
    if (!confirmed) {
      return;
    }

    setDiscarding(true);
    setError(null);
    const response = await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "DELETE",
    });
    setDiscarding(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not discard this job.");
      return;
    }

    router.push("/applications");
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5"
      onSubmit={onSubmit}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <input
          className={fieldClass}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Company</span>
        <input
          className={fieldClass}
          required
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Icon URL or path</span>
        <input
          className={fieldClass}
          value={companyLogoUrl}
          onChange={(event) => setCompanyLogoUrl(event.target.value)}
          placeholder="https://... or /icons/company.png"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Location</span>
        <input
          className={fieldClass}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Workplace</span>
        <select
          className={fieldClass}
          value={workplaceType}
          onChange={(event) => setWorkplaceType(event.target.value)}
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
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Job URL</span>
        <input
          className={fieldClass}
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Posting notes</span>
        <textarea
          className="min-h-32 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none ring-accent/30 transition focus:ring-2"
          value={descriptionText}
          onChange={(event) => setDescriptionText(event.target.value)}
          placeholder="Paste the description here before the posting gets rewritten by optimism."
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {saved ? <p className="text-sm text-muted">Saved.</p> : null}
      <button
        className="h-11 rounded-lg bg-accent font-medium text-accent-foreground disabled:opacity-60"
        type="submit"
        disabled={pending || discarding}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      <div className="border-t border-line pt-4">
        <button
          className="h-10 rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
          type="button"
          disabled={pending || discarding}
          onClick={discard}
        >
          {discarding ? "Discarding..." : "Discard role"}
        </button>
      </div>
    </form>
  );
}
