"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <output
      aria-live="polite"
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex justify-center px-3 pt-2"
    >
      <p className="flex items-center gap-2 rounded-full border border-line bg-panel/95 px-3.5 py-1.5 text-xs font-semibold text-muted shadow-[0_16px_40px_-28px_var(--shadow-soft)] backdrop-blur">
        <CloudOff
          aria-hidden="true"
          className="size-3.5 text-accent"
          strokeWidth={2.2}
        />
        Offline. Nothing will save until you reconnect.
      </p>
    </output>
  );
}
