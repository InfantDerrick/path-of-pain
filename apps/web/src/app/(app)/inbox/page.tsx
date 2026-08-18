import { listOpportunities } from "@jobtracker/db";
import Link from "next/link";
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

  const opportunities = await listOpportunities(session.user.id);
  const active = opportunities.filter((item) => item.status === "ACTIVE");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Needs attention</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Follow-ups and overdue tasks land here in a later phase. For now this is
        the quiet lobby before the next application.
      </p>
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <p className="text-sm text-muted">Active roles</p>
        <p className="mt-1 font-serif text-3xl">{active.length}</p>
        {active[0] ? (
          <p className="mt-3 text-sm text-muted">
            Last moved {formatRelativeTime(active[0].lastActivityAt)} ·{" "}
            {active[0].companyName}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Nothing in the pipeline yet.
          </p>
        )}
        <Link
          href="/applications"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Open applications
        </Link>
      </section>
    </main>
  );
}
