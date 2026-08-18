"use client";

import { cn } from "@jobtracker/ui";
import { FileText, History, type LucideIcon, Milestone } from "lucide-react";

const actions = [
  { href: "#notes", label: "Note", icon: FileText },
  { href: "#stage", label: "Stage", icon: Milestone },
  { href: "#timeline", label: "Log", icon: History },
];

function MobileDetailAction({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <a
      className={cn(
        "flex h-12 min-w-0 items-center justify-center gap-2 rounded-md border border-line bg-background/75 px-2 text-sm font-semibold text-foreground transition",
        "active:translate-y-px hover:border-accent/55 hover:text-accent",
      )}
      href={href}
    >
      <Icon className="size-4 shrink-0 text-accent" strokeWidth={2.1} />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function MobileDetailActions() {
  return (
    <nav
      aria-label="Role shortcuts"
      className="sticky top-[calc(env(safe-area-inset-top)+4.75rem)] z-20 mt-4 grid grid-cols-3 gap-2 rounded-lg border border-line bg-panel/95 p-2 shadow-[0_18px_45px_-38px_var(--shadow-soft)] backdrop-blur md:hidden"
    >
      {actions.map((action) => (
        <MobileDetailAction
          key={action.href}
          href={action.href}
          label={action.label}
          Icon={action.icon}
        />
      ))}
    </nav>
  );
}
