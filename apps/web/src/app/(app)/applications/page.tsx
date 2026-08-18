import { getVisibleStages, listOpportunities } from "@jobtracker/db";
import Link from "next/link";
import { ApplicationsBoard } from "@/components/opportunities/applications-board";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Trail",
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
  const activeCount = opportunities.filter(
    (opportunity) => opportunity.status === "ACTIVE",
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Trail</h1>
          <p className="mt-1 text-sm text-muted">
            {activeCount === 0
              ? "No open loops yet. Enjoy the silence while it lasts."
              : `${activeCount} roles being carried`}
          </p>
        </div>
        <Link
          href="/applications/new"
          className="hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground md:inline-flex"
        >
          Add role
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-line bg-panel p-6 text-center">
          <p className="font-medium">No roles saved yet</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Paste a posting URL and we’ll keep the useful parts. Manual entry is
            here when the page gives you nothing but vibes.
          </p>
          <Link
            href="/applications/new"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Add the first role
          </Link>
        </section>
      ) : (
        <ApplicationsBoard opportunities={opportunities} stages={stages} />
      )}
    </main>
  );
}
