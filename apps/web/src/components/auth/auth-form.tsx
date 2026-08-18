"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  registrationEnabled: boolean;
};

export function AuthForm({ registrationEnabled }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(
    registrationEnabled ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup" && registrationEnabled;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = isSignup
      ? await authClient.signUp.email({
          name: name.trim() || email.split("@")[0] || "Job seeker",
          email,
          password,
          callbackURL: "/applications",
        })
      : await authClient.signIn.email({
          email,
          password,
          callbackURL: "/applications",
        });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Unable to authenticate.");
      return;
    }

    router.push("/applications");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {isSignup ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            className="h-11 rounded-lg border border-line bg-panel px-3 outline-none ring-accent/30 transition focus:ring-2"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Rivera"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Email</span>
        <input
          className="h-11 rounded-lg border border-line bg-panel px-3 outline-none ring-accent/30 transition focus:ring-2"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Password</span>
        <input
          className="h-11 rounded-lg border border-line bg-panel px-3 outline-none ring-accent/30 transition focus:ring-2"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        className="mt-1 h-11 rounded-lg bg-accent font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Working..." : isSignup ? "Create account" : "Sign in"}
      </button>

      {registrationEnabled ? (
        <p className="text-center text-sm text-muted">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <button
            className="font-medium text-foreground underline decoration-line underline-offset-4"
            type="button"
            onClick={() => {
              setError(null);
              setMode(isSignup ? "signin" : "signup");
            }}
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-muted">
          Registration is closed on this instance.
        </p>
      )}
    </form>
  );
}
