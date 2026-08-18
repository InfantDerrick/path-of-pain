import { getVisibleStages, listOpportunities } from "@jobtracker/db";
import Link from "next/link";
import { ApplicationsBoard } from "@/components/opportunities/applications-board";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const [opportunities, stages] = await Promise.all([
    listOpportunities(session.user.id),
    getVisibleStages(session.user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="mt-1 text-sm text-muted">
            {opportunities.length === 0
              ? "A clean trailhead. Suspicious, but beautiful."
              : `${opportunities.length} tracked`}
          </p>
        </div>
        <Link
          href="/applications/new"
          className="hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground md:inline-flex"
        >
          Add job
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-line bg-panel p-6 text-center">
          <p className="font-medium">No pain logged yet</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Paste a posting URL and let the worker scrape meaning from the
            hiring page ritual. Manual entry is still here for the weird ones.
          </p>
          <Link
            href="/applications/new"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Start the trail
          </Link>
        </section>
      ) : (
        <ApplicationsBoard opportunities={opportunities} stages={stages} />
      )}
    </main>
  );
}
