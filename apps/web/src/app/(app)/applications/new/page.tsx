import { OpportunityForm } from "@/components/opportunities/opportunity-form";

export const metadata = {
  title: "Add job",
};

export default function NewOpportunityPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">Add a job</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Save the shell now. Enrichment from a posting URL is a later phase — a
        title and company are enough.
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <OpportunityForm />
      </div>
    </main>
  );
}
