import { getOpportunityDetail } from "@jobtracker/db";
import { notFound } from "next/navigation";
import { NotesPanel } from "@/components/opportunities/notes-panel";
import { OpportunityEditor } from "@/components/opportunities/opportunity-editor";
import { formatRelativeTime } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Opportunity",
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { id } = await params;
  const detail = await getOpportunityDetail(session.user.id, id);
  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="text-sm text-muted">
        {detail.stageName} · {formatRelativeTime(detail.lastActivityAt)}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {detail.title}
      </h1>
      <p className="mt-1 text-muted">{detail.companyName}</p>
      <div className="mt-6">
        <OpportunityEditor opportunity={detail} />
      </div>
      <NotesPanel
        opportunityId={detail.id}
        notes={detail.notes.map((item) => ({
          id: item.id,
          body: item.body,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted">Timeline</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {detail.events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-line bg-panel px-4 py-3"
            >
              <p className="text-sm font-medium">
                {event.type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatRelativeTime(event.occurredAt)} · {event.source}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
