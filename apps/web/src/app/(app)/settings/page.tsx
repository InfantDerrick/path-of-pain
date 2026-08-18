import { APP_NAME, APP_VERSION } from "@jobtracker/shared";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted">
        {APP_NAME} {APP_VERSION} · self-hosted, no telemetry.
      </p>
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Appearance</h2>
        <p className="mt-1 text-sm text-muted">
          Paper in the light. Rust still cuts through the dark.
        </p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-medium">Session</h2>
        <p className="mt-1 text-sm text-muted">
          Signing out stays on this instance. Nothing is sent anywhere else.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
