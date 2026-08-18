import { getAllStages, listEmailConnections } from "@jobtracker/db";
import { APP_NAME, APP_VERSION } from "@jobtracker/shared/constants";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EmailSettings } from "@/components/settings/email-settings";
import { StageSettings } from "@/components/settings/stage-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const [stages, emailConnections] = await Promise.all([
    getAllStages(session.user.id),
    listEmailConnections(session.user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        {APP_NAME} {APP_VERSION} · self-hosted, no telemetry, one database that
        remembers just enough.
      </p>
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Appearance</h2>
        <p className="mt-1 text-sm text-muted">
          Paper in the light, ember in the dark, enough texture to make the day
          feel touched by a human hand.
        </p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Email signals</h2>
        <p className="mt-1 text-sm text-muted">
          Connect IMAP with an app password. Recent mail is read for signals;
          the full letters are not stored.
        </p>
        <EmailSettings connections={emailConnections} />
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Stages</h2>
        <p className="mt-1 text-sm text-muted">
          Rename, reorder, or hide the parts of the process. Keep the names that
          feel true enough to use.
        </p>
        <StageSettings stages={stages} />
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Session</h2>
        <p className="mt-1 text-sm text-muted">
          Signing out stays on this instance.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
