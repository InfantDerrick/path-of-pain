"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const storageKey = "path-of-pain-theme";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-background p-1 text-sm">
      {(["light", "dark", "system"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`h-9 rounded-md capitalize ${
            theme === option
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => choose(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
