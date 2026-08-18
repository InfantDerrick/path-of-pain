import { listOpportunities } from "@jobtracker/db";
import Link from "next/link";
import { formatRelativeTime, workplaceLabels } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const opportunities = await listOpportunities(session.user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Applications</h1>
          <p className="mt-1 text-sm text-muted">
            {opportunities.length === 0
              ? "Empty on purpose. Add the first role."
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
          <p className="font-medium">No opportunities yet</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Create a role by hand. URL capture and enrichment come next.
          </p>
          <Link
            href="/applications/new"
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Add a job
          </Link>
        </section>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {opportunities.map((item) => (
            <li key={item.id}>
              <Link
                href={`/applications/${item.id}`}
                className="block rounded-2xl border border-line bg-panel p-4 transition hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {item.companyName}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                    {item.stageName}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {workplaceLabels[
                    item.workplaceType as keyof typeof workplaceLabels
                  ] ?? item.workplaceType}{" "}
                  · {formatRelativeTime(item.lastActivityAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
