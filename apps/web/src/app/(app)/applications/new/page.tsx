import { AddPainFlow } from "@/components/opportunities/add-pain-flow";

export const metadata = {
  title: "Add role",
};

export default function NewOpportunityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <AddPainFlow />
    </main>
  );
}
