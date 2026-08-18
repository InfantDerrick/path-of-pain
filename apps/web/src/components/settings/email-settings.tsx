"use client";

import { cn } from "@jobtracker/ui";
import { Inbox, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { formatRelativeTime } from "@/lib/format";

type EmailConnection = {
  id: string;
  provider: string;
  label: string;
  status: string;
  lastSyncAt: Date | null;
  lastError: string | null;
  syncWindowDays: number;
  storeSubject: boolean;
};

type Preset = {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
};

const presets: Preset[] = [
  {
    id: "gmail",
    label: "Gmail",
    host: "imap.gmail.com",
    port: 993,
    secure: true,
  },
  {
    id: "icloud",
    label: "iCloud",
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
  },
  {
    id: "fastmail",
    label: "Fastmail",
    host: "imap.fastmail.com",
    port: 993,
    secure: true,
  },
  {
    id: "custom",
    label: "Custom",
    host: "",
    port: 993,
    secure: true,
  },
];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Watching",
    syncing: "Reading the smoke",
    paused: "Paused",
    error: "Needs attention",
  };
  return labels[status] ?? status;
}

export function EmailSettings({
  connections,
}: {
  connections: EmailConnection[];
}) {
  const router = useRouter();
  const [presetId, setPresetId] = useState("gmail");
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState(993);
  const [secure, setSecure] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mailbox, setMailbox] = useState("INBOX");
  const [syncWindowDays, setSyncWindowDays] = useState(14);
  const [storeSubject, setStoreSubject] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectPreset(id: string) {
    setPresetId(id);
    const preset = presets.find((item) => item.id === id);
    if (!preset) {
      return;
    }
    setHost(preset.host);
    setPort(preset.port);
    setSecure(preset.secure);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/email/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: username,
          host,
          port,
          secure,
          username,
          password,
          mailbox,
          syncWindowDays,
          storeSubject,
          testConnection: true,
          syncNow: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not configure this mailbox.");
        return;
      }
      setMessage("Mailbox connected. Fresh signals are headed to Flare.");
      setPassword("");
      router.refresh();
    });
  }

  function sync(connectionId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/email/connections/${connectionId}/sync`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not queue mailbox sync.");
        return;
      }
      setMessage("Sync queued. Flare will twitch if anything moved.");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 grid gap-4">
      {connections.length ? (
        <div className="grid gap-2">
          {connections.map((connection) => (
            <div
              className="rounded-xl border border-line bg-background/60 p-3"
              key={connection.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {connection.label}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {statusLabel(connection.status)}
                    {connection.lastSyncAt
                      ? ` · synced ${formatRelativeTime(connection.lastSyncAt)}`
                      : " · not synced yet"}
                  </p>
                </div>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium disabled:opacity-60"
                  disabled={pending}
                  onClick={() => sync(connection.id)}
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  Sync
                </button>
              </div>
              {connection.lastError ? (
                <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {connection.lastError}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="rounded-2xl border border-line bg-background/60 p-4"
        onSubmit={submit}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Inbox className="size-4 text-accent" />
          IMAP mailbox
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((preset) => (
            <button
              className={cn(
                "h-10 rounded-lg border border-line text-sm transition",
                presetId === preset.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-panel text-muted hover:text-foreground",
              )}
              key={preset.id}
              onClick={() => selectPreset(preset.id)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_7rem]">
          <label className="grid gap-1.5 text-sm font-medium">
            Host
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              onChange={(event) => setHost(event.target.value)}
              placeholder="imap.gmail.com"
              required
              value={host}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Port
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              max={65_535}
              min={1}
              onChange={(event) => setPort(Number(event.target.value))}
              required
              type="number"
              value={port}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Email / username
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="you@example.com"
              required
              value={username}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            App password
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="not your main password"
              required
              type="password"
              value={password}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Mailbox
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              onChange={(event) => setMailbox(event.target.value)}
              required
              value={mailbox}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Days to scan
            <input
              className="h-11 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
              max={60}
              min={1}
              onChange={(event) =>
                setSyncWindowDays(Number(event.target.value))
              }
              required
              type="number"
              value={syncWindowDays}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-2 rounded-xl border border-line bg-panel/60 p-3">
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              checked={secure}
              className="mt-1"
              onChange={(event) => setSecure(event.target.checked)}
              type="checkbox"
            />
            Use SSL/TLS. Leave this on for Gmail, iCloud, Fastmail, and most
            sane mail hosts.
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              checked={storeSubject}
              className="mt-1"
              onChange={(event) => setStoreSubject(event.target.checked)}
              type="checkbox"
            />
            Store email subjects with message refs. The full body is never kept.
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}

        <button
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          <MailCheck className="size-4" />
          Test, save, and sync
        </button>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          Path of Pain reads recent messages only when syncing, extracts
          deterministic signals, then discards the parsed body before writing to
          Postgres.
        </p>
      </form>
    </div>
  );
}
