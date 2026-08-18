"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

type NotesPanelProps = {
  opportunityId: string;
  notes: Array<{ id: string; body: string; createdAt: string }>;
};

export function NotesPanel({ opportunityId, notes }: NotesPanelProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const draftKey = `path-of-pain-note-draft:${opportunityId}`;

  useEffect(() => {
    setBody(localStorage.getItem(draftKey) ?? "");
  }, [draftKey]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (body) {
        localStorage.setItem(draftKey, body);
      } else {
        localStorage.removeItem(draftKey);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [body, draftKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch(`/api/opportunities/${opportunityId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });

    setPending(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save that note.");
      return;
    }

    setBody("");
    localStorage.removeItem(draftKey);
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">Notes</h2>
      <form
        className="mt-3 rounded-2xl border border-line bg-panel p-5"
        onSubmit={onSubmit}
      >
        <textarea
          className="min-h-24 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none ring-accent/30 transition focus:ring-2"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Autosaved draft. Spill the context before memory edits the scene."
          required
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          className="mt-3 h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving..." : "Commit note"}
        </button>
      </form>
      <ul className="mt-3 flex flex-col gap-3">
        {notes.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-line bg-panel px-4 py-3"
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
            <p className="mt-2 text-xs text-muted">
              {formatRelativeTime(item.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
