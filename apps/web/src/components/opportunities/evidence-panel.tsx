"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

type Snapshot = {
  id: string;
  contentType: string;
  size: number;
  hash: string;
  capturedAt: string;
};

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  url: string | null;
  notes: string | null;
  relationship: string | null;
  createdAt: string;
};

type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  kind: string;
  notes: string | null;
  createdAt: string;
};

type EvidencePanelProps = {
  opportunityId: string;
  snapshots: Snapshot[];
  contacts: Contact[];
  attachments: Attachment[];
};

const attachmentLabels: Record<string, string> = {
  resume: "Resume",
  recruiter_doc: "Recruiter doc",
  offer_doc: "Offer doc",
  other: "Other",
};

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`;
  }
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

export function EvidencePanel({
  opportunityId,
  snapshots,
  contacts,
  attachments,
}: EvidencePanelProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestSnapshot = snapshots[0];

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("contact");
    setError(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/opportunities/${opportunityId}/contacts`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          role: data.get("role"),
          email: data.get("email"),
          phone: data.get("phone"),
          url: data.get("url"),
          relationship: data.get("relationship"),
          notes: data.get("notes"),
        }),
      },
    );
    setPending(null);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save that contact.");
      return;
    }
    event.currentTarget.reset();
    setContactOpen(false);
    router.refresh();
  }

  async function addAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("file");
    setError(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch(
      `/api/opportunities/${opportunityId}/attachments`,
      {
        method: "POST",
        body: data,
      },
    );
    setPending(null);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not attach that file.");
      return;
    }
    event.currentTarget.reset();
    setFileOpen(false);
    router.refresh();
  }

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-lg border border-line bg-panel p-4 shadow-[0_18px_46px_-38px_var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            Proof
          </p>
          <h2 className="mt-1 text-lg font-semibold">Things worth keeping</h2>
        </div>
        <div className="rounded-full border border-line bg-background px-3 py-1 text-xs text-muted">
          {snapshots.length + contacts.length + attachments.length} saved
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-line bg-background p-3">
          <p className="text-sm font-medium">Original posting</p>
          {latestSnapshot ? (
            <div className="mt-3">
              <a
                className="inline-flex h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground"
                href={`/api/opportunities/${opportunityId}/snapshots/${latestSnapshot.id}`}
              >
                Open snapshot
              </a>
              <p className="mt-2 text-xs leading-5 text-muted">
                {formatBytes(latestSnapshot.size)} ·{" "}
                {formatRelativeTime(latestSnapshot.capturedAt)}
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-muted">
                {latestSnapshot.hash.slice(0, 18)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              No captured posting yet. The next successful enrichment should
              keep a copy before the page quietly changes.
            </p>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-line bg-background p-3 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Contacts</p>
            <button
              className="h-8 rounded-lg border border-line px-3 text-xs"
              type="button"
              onClick={() => setContactOpen((open) => !open)}
            >
              {contactOpen ? "Close" : "Add"}
            </button>
          </div>
          {contactOpen ? (
            <form className="mt-3 grid min-w-0 gap-2" onSubmit={addContact}>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="name"
                  placeholder="Name"
                  required
                />
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="relationship"
                  placeholder="Relationship"
                />
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="role"
                  placeholder="Role"
                />
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="email"
                  placeholder="Email"
                  type="email"
                />
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="phone"
                  placeholder="Phone"
                />
                <input
                  className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
                  name="url"
                  placeholder="Profile URL"
                  type="url"
                />
              </div>
              <textarea
                className="min-h-20 min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none"
                name="notes"
                placeholder="Context, warnings, promises made casually"
              />
              <button
                className="h-10 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
                disabled={pending === "contact"}
                type="submit"
              >
                {pending === "contact" ? "Pinning..." : "Pin contact"}
              </button>
            </form>
          ) : null}
          <div className="mt-3 grid gap-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted">
                Nobody on the record yet. Add the recruiter before their name
                becomes another half-remembered thread.
              </p>
            ) : (
              contacts.map((item) => (
                <div
                  className="rounded-lg border border-line bg-panel-soft px-3 py-2"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.relationship ? (
                      <span className="text-xs text-accent">
                        {item.relationship}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[item.role, item.email, item.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.url ? (
                    <a
                      className="mt-1 block truncate text-sm text-accent"
                      href={item.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {item.url}
                    </a>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-2 text-sm leading-6">{item.notes}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 min-w-0 rounded-lg border border-line bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Files</p>
          <button
            className="h-8 rounded-lg border border-line px-3 text-xs"
            type="button"
            onClick={() => {
              setFileOpen((open) => !open);
              fileRef.current?.focus();
            }}
          >
            {fileOpen ? "Close" : "Attach"}
          </button>
        </div>
        {fileOpen ? (
          <form
            className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={addAttachment}
          >
            <input
              className="h-10 min-w-0 max-w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-accent"
              name="file"
              ref={fileRef}
              required
              type="file"
            />
            <select
              className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              name="kind"
            >
              <option value="resume">Resume</option>
              <option value="recruiter_doc">Recruiter doc</option>
              <option value="offer_doc">Offer doc</option>
              <option value="other">Other</option>
            </select>
            <input
              className="h-10 min-w-0 rounded-lg border border-line bg-panel px-3 text-sm outline-none sm:col-span-2"
              name="notes"
              placeholder="Why this file matters"
            />
            <button
              className="h-10 min-w-0 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-60 sm:col-span-2"
              disabled={pending === "file"}
              type="submit"
            >
              {pending === "file" ? "Saving..." : "Save file"}
            </button>
          </form>
        ) : null}
        <div className="mt-3 grid gap-2">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted">
              No files yet. Resumes, recruiter notes, and offer letters can stay
              here.
            </p>
          ) : (
            attachments.map((item) => (
              <a
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel-soft px-3 py-2 transition hover:border-accent/60"
                href={`/api/opportunities/${opportunityId}/attachments/${item.id}`}
                key={item.id}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {item.filename}
                  </span>
                  <span className="block text-xs text-muted">
                    {attachmentLabels[item.kind] ?? "Other"} ·{" "}
                    {formatBytes(item.size)} ·{" "}
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">
                  Download
                </span>
              </a>
            ))
          )}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
