"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const trackInstalling = (registration: ServiceWorkerRegistration) => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }
      installing.addEventListener("statechange", () => {
        // A worker that installs while another controls the page is an update.
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller &&
          !cancelled
        ) {
          setWaitingWorker(installing);
        }
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) {
          return;
        }
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }
        registration.addEventListener("updatefound", () =>
          trackInstalling(registration),
        );
      } catch {
        // A failed registration must never take the page down with it.
      }
    };

    // Hydration often happens after `load` has already fired, in which case
    // listening for it would never register the worker at all.
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    const onControllerChange = () => {
      if (!updateRequested.current) {
        return;
      }
      updateRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) {
      return;
    }
    updateRequested.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setWaitingWorker(null);
  }, [waitingWorker]);

  if (!waitingWorker) {
    return null;
  }

  return (
    <output className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+9.2rem)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-panel/95 p-3 shadow-[0_20px_50px_-30px_var(--shadow-soft)] backdrop-blur md:inset-x-auto md:right-5 md:bottom-5 md:mx-0">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent"
      >
        <RefreshCw className="size-4" strokeWidth={2.2} />
      </span>
      <p className="min-w-0 flex-1 text-xs leading-5 text-muted">
        A newer version of the ledger is ready.
      </p>
      <button
        type="button"
        onClick={applyUpdate}
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition active:translate-y-px"
      >
        Refresh
      </button>
    </output>
  );
}
