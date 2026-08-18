import { ensurePipelineStages } from "@jobtracker/db";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await ensurePipelineStages(session.user.id);

  return (
    <AppShell userLabel={session.user.name || session.user.email}>
      {children}
    </AppShell>
  );
}
