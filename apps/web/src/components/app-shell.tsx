"use client";

import { APP_NAME } from "@jobtracker/shared/constants";
import { cn } from "@jobtracker/ui";
import { Flame, type LucideIcon, Plus, Route, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo-mark";

const nav = [
  { href: "/inbox", label: "Sightings" },
  { href: "/applications", label: "Trail" },
  { href: "/settings", label: "Settings" },
];

const mobileDestinations = [
  { href: "/applications", label: "Trail", icon: Route },
  { href: "/inbox", label: "Sightings", icon: Flame },
  { href: "/settings", label: "Settings", icon: Settings },
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

function MobileNavItem({
  href,
  label,
  Icon,
  pathname,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  pathname: string;
}) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-13 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[0.66rem] font-semibold transition active:translate-y-px",
        active
          ? "bg-background/45 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--line)_68%,transparent)]"
          : "text-muted hover:bg-background/50 hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-7 place-items-center rounded-md border transition",
          active
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-line bg-panel-soft text-muted group-hover:border-accent/70",
        )}
      >
        <Icon className="size-3.5" strokeWidth={2.2} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  const addPainActive = pathname === "/applications/new";

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel/90 shadow-[18px_0_60px_-42px_var(--shadow-soft)] md:flex">
        <div className="px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <Link
            href="/applications"
            className="flex items-center gap-2.5 text-foreground"
          >
            <LogoMark className="size-8 shrink-0" />
            <span className="min-w-0 truncate font-serif text-[1.45rem] leading-none tracking-tight">
              {APP_NAME}
            </span>
          </Link>
          <p className="mt-3 text-xs leading-5 text-muted">
            {userLabel}
            <span className="mt-1 block">
              A quiet place for a loud process.
            </span>
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <p className="px-3 pb-2 pt-1 text-[0.67rem] font-semibold uppercase tracking-[0.22em] text-accent">
            Private
          </p>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                isActive(pathname, item.href)
                  ? "bg-background/80 text-foreground shadow-[inset_3px_0_0_var(--accent)]"
                  : "text-muted hover:bg-background/60 hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full border border-line transition",
                  isActive(pathname, item.href)
                    ? "border-accent bg-accent"
                    : "bg-panel-soft group-hover:border-accent/60",
                )}
              />
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-line pt-4">
            <Link
              href="/applications/new"
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-semibold transition",
                addPainActive
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_10px_28px_-20px_var(--accent)]"
                  : "border-line bg-panel-soft text-foreground hover:border-accent/70 hover:text-accent",
              )}
            >
              <span>Add role</span>
              <span
                aria-hidden
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-base leading-none",
                  addPainActive
                    ? "border-accent-foreground/40"
                    : "border-line text-accent",
                )}
              >
                +
              </span>
            </Link>
          </div>
        </nav>
        <p className="px-5 pb-5 text-xs leading-5 text-muted">
          No audience. Just what happened, kept gently.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-panel/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-[0_18px_45px_-42px_var(--shadow-soft)] backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/applications"
              className="flex min-w-0 items-center gap-2 text-foreground"
            >
              <LogoMark className="size-7 shrink-0" />
              <span className="min-w-0 truncate font-serif text-[1.4rem] leading-none tracking-tight">
                {APP_NAME}
              </span>
            </Link>
            <span className="rounded-md border border-line bg-background/70 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Private
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted">{userLabel}</p>
        </header>
        <div className="flex-1 pb-44 md:pb-0">{children}</div>
        <Link
          href="/applications/new"
          className={cn(
            "fixed bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+4.95rem)] right-4 z-30 grid size-12 place-items-center overflow-hidden rounded-xl border shadow-[0_18px_42px_-29px_var(--accent)] transition active:translate-y-px md:hidden",
            addPainActive
              ? "border-accent/65 bg-accent/85 text-accent-foreground"
              : "border-line bg-accent/80 text-accent-foreground",
          )}
          aria-label="Add role"
          title="Add role"
        >
          <span
            aria-hidden
            className="absolute inset-1 rounded-lg border border-accent-foreground/20"
          />
          <span
            aria-hidden
            className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(255,247,237,0.55)_0_1px,transparent_1.3px)] [background-size:10px_10px]"
          />
          <Plus className="relative size-5" strokeWidth={2.4} />
        </Link>
        <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-20 overflow-hidden rounded-xl border border-line bg-panel/95 p-1.5 shadow-[0_-18px_55px_-38px_var(--shadow-soft)] backdrop-blur md:hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,var(--paper-fleck)_0_1px,transparent_1.35px)] [background-size:12px_12px]"
          />
          <div className="relative grid grid-cols-3 items-end gap-1">
            {mobileDestinations.map((item) => (
              <MobileNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                pathname={pathname}
              />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
