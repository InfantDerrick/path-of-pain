"use client";

import { APP_NAME } from "@jobtracker/shared/constants";
import { cn } from "@jobtracker/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UrlCaptureForm } from "./opportunities/url-capture-form";

const nav = [
  { href: "/inbox", label: "Flare-ups" },
  { href: "/applications", label: "Trail" },
  { href: "/applications/new", label: "Add pain" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/applications") {
    return (
      pathname === "/applications" ||
      (pathname.startsWith("/applications/") &&
        pathname !== "/applications/new")
    );
  }
  return pathname === href;
}

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-panel/90 shadow-[18px_0_60px_-42px_var(--shadow-soft)] md:flex">
        <div className="px-5 py-6">
          <Link
            href="/applications"
            className="font-serif text-2xl tracking-tight text-foreground"
          >
            {APP_NAME}
          </Link>
          <p className="mt-2 text-xs leading-5 text-muted">
            {userLabel}
            <span className="mt-1 block">Private misery ledger.</span>
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(pathname, item.href) &&
                  item.href !== "/applications/new"
                  ? "bg-background text-foreground"
                  : "text-muted hover:bg-background hover:text-foreground",
                item.href === "/applications/new" &&
                  "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground hover:opacity-90",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="px-5 pb-5 text-xs leading-5 text-muted">
          No telemetry. No cloud therapist. Just the receipts.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center gap-4 border-b border-line bg-panel/90 px-5 py-3 shadow-[0_18px_45px_-42px_var(--shadow-soft)] md:flex">
          <UrlCaptureForm />
        </header>
        <header className="flex items-center justify-between border-b border-line bg-panel/90 px-4 py-3 md:hidden">
          <Link
            href="/applications"
            className="font-serif text-xl tracking-tight"
          >
            {APP_NAME}
          </Link>
          <Link
            href="/applications/new"
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
          >
            Add pain
          </Link>
        </header>
        <div className="border-b border-line bg-panel/90 px-4 py-3 md:hidden">
          <UrlCaptureForm compact />
        </div>
        <div className="flex-1 pb-20 md:pb-0">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-panel md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-14 items-center justify-center text-xs font-medium",
                isActive(pathname, item.href) ? "text-accent" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
