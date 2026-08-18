import { isRegistrationOpen } from "@jobtracker/auth";
import { APP_NAME, APP_TAGLINE } from "@jobtracker/shared";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/applications");
  }

  let registrationEnabled = true;
  try {
    registrationEnabled = await isRegistrationOpen();
  } catch {
    registrationEnabled = true;
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-[0_20px_50px_-28px_rgba(26,22,18,0.45)] sm:p-8">
        <p className="font-serif text-3xl tracking-tight">{APP_NAME}</p>
        <h1 className="mt-2 text-xl font-semibold">
          {registrationEnabled ? "Set up this instance" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">{APP_TAGLINE}</p>
        <div className="mt-6">
          <AuthForm registrationEnabled={registrationEnabled} />
        </div>
      </div>
    </main>
  );
}
