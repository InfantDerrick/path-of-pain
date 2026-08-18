"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function UrlCaptureForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceUrl.trim()) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl, intent: "SAVE" }),
    });
    const payload = (await response.json()) as {
      id?: string;
      error?: string;
      existingId?: string;
    };
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not save this URL.");
      if (payload.existingId) {
        router.push(`/applications/${payload.existingId}`);
      }
      return;
    }

    router.push(`/applications/${payload.id}`);
    router.refresh();
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={onSubmit}
    >
      <input
        aria-label="Job URL"
        className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-background px-3 text-sm outline-none ring-accent/30 transition focus:ring-2"
        type="url"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        placeholder={compact ? "Paste job URL" : "Paste a fresh ordeal URL"}
      />
      <button
        className="h-10 shrink-0 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Saving" : "Capture"}
      </button>
      {error ? <p className="sr-only">{error}</p> : null}
    </form>
  );
}
