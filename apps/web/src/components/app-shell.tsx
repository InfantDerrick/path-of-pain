"use client";

import { APP_NAME } from "@jobtracker/shared";
import { cn } from "@jobtracker/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/inbox", label: "Inbox" },
  { href: "/applications", label: "Applications" },
  { href: "/applications/new", label: "Add" },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-panel md:flex">
        <div className="px-5 py-6">
          <Link
            href="/applications"
            className="font-serif text-2xl tracking-tight"
          >
            {APP_NAME}
          </Link>
          <p className="mt-2 text-xs leading-5 text-muted">{userLabel}</p>
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3 md:hidden">
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
            Add
          </Link>
        </header>
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
