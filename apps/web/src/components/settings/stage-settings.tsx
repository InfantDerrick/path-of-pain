"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type Stage = {
  id?: string;
  name: string;
  orderIndex: number;
  hidden: boolean;
};

export function StageSettings({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(stages);
  const [saved, setSaved] = useState(false);

  function update(index: number, patch: Partial<Stage>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const ordered = items.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
    const response = await fetch("/api/stages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stages: ordered }),
    });
    if (response.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
      {items.map((stage, index) => (
        <div
          key={stage.id ?? `new-${index}`}
          className="grid gap-2 rounded-lg border border-line bg-background p-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <input
            className="h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none"
            value={stage.name}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <label className="flex h-10 items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={stage.hidden}
              onChange={(event) =>
                update(index, { hidden: event.target.checked })
              }
            />
            Hidden
          </label>
          <div className="flex gap-1">
            <button
              className="h-10 rounded-lg border border-line px-3 text-sm disabled:opacity-40"
              type="button"
              disabled={index === 0}
              onClick={() =>
                setItems((current) => {
                  const next = [...current];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  return next;
                })
              }
            >
              Up
            </button>
            <button
              className="h-10 rounded-lg border border-line px-3 text-sm disabled:opacity-40"
              type="button"
              disabled={index === items.length - 1}
              onClick={() =>
                setItems((current) => {
                  const next = [...current];
                  [next[index], next[index + 1]] = [
                    next[index + 1],
                    next[index],
                  ];
                  return next;
                })
              }
            >
              Down
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          className="h-10 rounded-lg border border-line px-4 text-sm font-medium"
          type="button"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                name: "New stage",
                orderIndex: current.length,
                hidden: false,
              },
            ])
          }
        >
          Add stage
        </button>
        <button
          className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
          type="submit"
        >
          Save stages
        </button>
        {saved ? (
          <p className="text-sm text-muted">Trail markers moved.</p>
        ) : null}
      </div>
    </form>
  );
}
