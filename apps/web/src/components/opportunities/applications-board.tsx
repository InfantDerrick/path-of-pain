"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CompanyIcon } from "@/components/opportunities/company-icon";
import { formatRelativeTime, workplaceLabels } from "@/lib/format";

type Stage = {
  id: string;
  name: string;
  slug: string;
};

type Opportunity = {
  id: string;
  title: string;
  status: string;
  location: string | null;
  workplaceType: string;
  compensation: string | null;
  companyName: string;
  companyLogoUrl: string | null;
  stageId: string;
  stageName: string;
  lastActivityAt: Date;
};

const stageRewards = [
  "Filed without vanishing into mist.",
  "Application sent. A tiny victory stamp.",
  "Assessment unlocked. The puzzle door creaks.",
  "Recruiter checkpoint reached.",
  "Technical screen queued. Bring snacks.",
  "Onsite marked. Deep breath.",
  "Offer sighted. Suspiciously shiny.",
  "Accepted. The path gives way.",
];

function OpportunityCard({
  item,
  dragging,
}: {
  item: Opportunity;
  dragging: boolean;
}) {
  return (
    <a
      href={`/applications/${item.id}`}
      className={`block rounded-lg border border-line bg-panel/95 p-3 shadow-[0_12px_34px_-30px_var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_16px_34px_-28px_var(--shadow-soft)] ${
        dragging ? "scale-[0.98] opacity-55" : ""
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanyIcon
          src={item.companyLogoUrl}
          name={item.companyName}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-5">
            {item.title}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {item.companyName}
            {item.location ? ` · ${item.location}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted">
        <span className="inline-flex h-6 items-center rounded-full border border-line bg-panel-soft px-2.5">
          {workplaceLabels[
            item.workplaceType as keyof typeof workplaceLabels
          ] ?? item.workplaceType}
        </span>
        <span className="shrink-0">
          {formatRelativeTime(item.lastActivityAt)}
        </span>
        {item.compensation ? (
          <span className="inline-flex h-6 min-w-0 items-center truncate rounded-full border border-accent/25 bg-accent/10 px-2.5 text-accent">
            {item.compensation}
          </span>
        ) : null}
      </div>
    </a>
  );
}

export function ApplicationsBoard({
  opportunities,
  stages,
}: {
  opportunities: Opportunity[];
  stages: Stage[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "board">("board");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [landedStageId, setLandedStageId] = useState<string | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const draggingOpportunity = useMemo(
    () => opportunities.find((item) => item.id === draggingId),
    [draggingId, opportunities],
  );

  async function move(opportunityId: string, stageId: string) {
    if (draggingOpportunity?.stageId === stageId) {
      setDraggingId(null);
      setDragOverStageId(null);
      return;
    }
    const stage = stages.find((item) => item.id === stageId);
    await fetch(`/api/opportunities/${opportunityId}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    setDraggingId(null);
    setDragOverStageId(null);
    setLandedStageId(stageId);
    setReward(
      stage
        ? `${stage.name}: ${
            stageRewards[stages.findIndex((item) => item.id === stageId)] ??
            "Moved. The ledger approves."
          }`
        : "Moved. The ledger approves.",
    );
    window.setTimeout(() => setLandedStageId(null), 900);
    window.setTimeout(() => setReward(null), 2600);
    router.refresh();
  }

  return (
    <section className="mt-6">
      <div className="hidden justify-end md:flex">
        <div className="grid grid-cols-2 rounded-lg border border-line bg-panel p-1 text-sm">
          {(["board", "list"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`h-8 rounded-md px-3 capitalize ${
                view === option
                  ? "bg-accent text-accent-foreground"
                  : "text-muted"
              }`}
              onClick={() => setView(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ul
        className={`flex flex-col gap-3 ${view === "board" ? "md:hidden" : ""}`}
      >
        {opportunities.map((item) => (
          <li key={item.id}>
            <OpportunityCard item={item} dragging={false} />
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {item.stageName}
            </span>
          </li>
        ))}
      </ul>

      {view === "board" ? (
        <div className="mt-4 hidden gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
          {stages.map((stage) => {
            const items = opportunities.filter(
              (item) => item.stageId === stage.id,
            );
            const armed = dragOverStageId === stage.id;
            const landed = landedStageId === stage.id;
            const canDrop =
              Boolean(draggingId) && draggingOpportunity?.stageId !== stage.id;
            return (
              <section
                key={stage.id}
                aria-label={`${stage.name} stage`}
                className={`relative min-h-72 rounded-lg border bg-panel-soft/70 p-3 transition ${
                  armed && canDrop
                    ? "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--accent),0_18px_50px_-36px_var(--accent)]"
                    : landed
                      ? "stage-drop-pop border-accent/60"
                      : "border-line"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverStageId(stage.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = canDrop ? "move" : "none";
                  setDragOverStageId(stage.id);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    setDragOverStageId(null);
                  }
                }}
                onDrop={() => {
                  if (draggingId && canDrop) {
                    void move(draggingId, stage.id);
                  } else {
                    setDraggingId(null);
                    setDragOverStageId(null);
                  }
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">
                      {stage.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {armed && canDrop
                        ? "Release to move"
                        : "Drag a role here"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex min-w-7 justify-center rounded-full border px-2 py-0.5 text-xs transition ${
                      items.length > 0
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-line bg-panel text-muted"
                    }`}
                  >
                    {items.length}
                  </span>
                </div>
                <ul className="flex min-h-52 flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      draggable
                      className="cursor-grab active:cursor-grabbing"
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStageId(null);
                      }}
                    >
                      <OpportunityCard
                        item={item}
                        dragging={draggingId === item.id}
                      />
                    </li>
                  ))}
                </ul>
                {items.length === 0 ? (
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
                    Empty. Peaceful. Untrustworthy.
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
      {reward ? (
        <div className="stage-reward-toast fixed bottom-5 left-1/2 z-30 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 rounded-lg border border-accent/40 bg-panel px-4 py-3 text-sm shadow-[0_18px_60px_-28px_var(--shadow-soft)]">
          {reward}
        </div>
      ) : null}
    </section>
  );
}
