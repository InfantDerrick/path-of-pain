"use client";

import { useEffect, useState } from "react";

const actions = [
  { href: "#notes", label: "Note" },
  { href: "#stage", label: "Stage" },
  { href: "#timeline", label: "Log" },
];

export function MobileDetailActions() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-3 bottom-40 z-30 grid grid-cols-3 gap-2 rounded-lg border border-line bg-panel/95 p-2 shadow-[0_20px_60px_-30px_var(--shadow-soft)] backdrop-blur md:hidden ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } transition`}
    >
      {actions.map((action) => (
        <a
          className="flex h-11 items-center justify-center rounded-md bg-background text-sm font-medium text-foreground"
          href={action.href}
          key={action.href}
        >
          {action.label}
        </a>
      ))}
    </div>
  );
}
