import { getDashboard } from "@jobtracker/db";
import Link from "next/link";
import { EmailSuggestionCard } from "@/components/email/email-suggestion-card";
import { formatRelativeTime } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const dashboard = await getDashboard(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Needs attention</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Follow-ups, overdue tasks, failed parsing, and other sharp little edges
        will collect here. Today it is mercifully quiet.
      </p>
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm text-muted">Active roles</p>
        <p className="mt-1 font-serif text-3xl">{dashboard.counts.active}</p>
        <p className="mt-3 text-sm text-muted">
          {dashboard.counts.needsAttention === 0
            ? "Nothing is yelling. A rare and delicate peace."
            : `${dashboard.counts.needsAttention} things are tapping the glass.`}
        </p>
        <Link
          href="/applications"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Open applications
        </Link>
      </section>
      <section className="mt-4 grid gap-4">
        {dashboard.emailSuggestions.map((item) => (
          <EmailSuggestionCard key={item.id} suggestion={item} />
        ))}
        {dashboard.overdueTasks.map((item) => (
          <Link
            key={item.id}
            href={`/applications/${item.opportunityId}`}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <p className="text-sm font-medium">Overdue: {item.title}</p>
            <p className="mt-1 text-xs text-muted">
              {item.companyName}
              {item.dueAt ? ` · due ${formatRelativeTime(item.dueAt)}` : ""}
            </p>
          </Link>
        ))}
        {dashboard.upcomingInterviews.map((item) => (
          <Link
            key={item.id}
            href={`/applications/${item.opportunityId}`}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <p className="text-sm font-medium">{item.type}</p>
            <p className="mt-1 text-xs text-muted">
              {item.companyName} · {new Date(item.scheduledAt).toLocaleString()}
            </p>
          </Link>
        ))}
        {dashboard.failedEnrichment.map((item) => (
          <Link
            key={item.opportunityId}
            href={`/applications/${item.opportunityId}`}
            className="rounded-lg border border-line bg-panel p-4"
          >
            <p className="text-sm font-medium">Parser hit a wall</p>
            <p className="mt-1 text-xs text-muted">
              {item.companyName} · {item.error ?? "No error recorded"}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
