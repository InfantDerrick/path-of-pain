"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
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
  stageSlug: string;
  lastActivityAt: Date;
};

type StageToast = {
  title: string;
  body: string;
  tone?: "default" | "warning" | "victory";
};

type ActiveStageToast = StageToast & {
  id: string;
  companyName: string;
};

const stageRewards: Record<string, StageToast> = {
  saved: {
    title: "Saved",
    body: "Nothing has happened yet. That is still information.",
  },
  applied: {
    title: "Applied",
    body: "Now comes the quiet part, where the inbox gets theatrical.",
  },
  assessment: {
    title: "Assessment noted",
    body: "Another little proof of worth, scheduled by someone else.",
  },
  recruiter: {
    title: "Recruiter screen",
    body: "A real person has entered the process. May they be specific.",
  },
  technical: {
    title: "Technical screen",
    body: "Bring your notes, your water, and the part of you that can explain a tradeoff calmly.",
  },
  onsite: {
    title: "Onsite",
    body: "A long day pretending not to measure every pause.",
  },
  "team-match": {
    title: "Team Match",
    body: "The soft scary part: everybody likes you, and somehow nobody can decide.",
    tone: "warning",
  },
  offer: {
    title: "Written offer",
    body: "It exists in writing now. Let the relief arrive before the PR's start piling in",
    tone: "victory",
  },
  negotiation: {
    title: "Negotiation",
    body: "The numbers are here. Be kind to yourself and exact with them.",
  },
  accepted: {
    title: "Accepted",
    body: "You can put this one down.",
    tone: "victory",
  },
  rejected: {
    title: "Rejected",
    body: "That door closed. You still get to keep what you learned standing in front of it.",
    tone: "warning",
  },
  ghosted: {
    title: "Ghosted",
    body: "No answer. Just the shape of silence where a reply was supposed to be.",
    tone: "warning",
  },
};

const toastDurationMs = 6400;

function rewardForStage(stage: Stage | undefined): StageToast {
  if (!stage) {
    return {
      title: "Moved",
      body: "The record changed because the day did.",
    };
  }

  return (
    stageRewards[stage.slug] ?? {
      title: stage.name,
      body: "Updated. Small motion still counts.",
    }
  );
}

function createStageToast({
  stage,
  opportunity,
}: {
  stage: Stage | undefined;
  opportunity: Opportunity | undefined;
}): ActiveStageToast {
  const reward = rewardForStage(stage);
  const companyName = opportunity?.companyName ?? "This role";

  return {
    ...reward,
    id: `${stage?.id ?? "unknown"}-${opportunity?.id ?? "role"}-${Date.now()}`,
    title: `${companyName}: ${reward.title}`,
    companyName,
  };
}

async function celebrateOffer() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#f45b12", "#f2b46d", "#efe6d8", "#5f3a23", "#171310"];
  const common = {
    colors,
    disableForReducedMotion: true,
    scalar: 0.88,
    ticks: 190,
  };

  confetti({
    ...common,
    particleCount: 70,
    spread: 78,
    origin: { x: 0.22, y: 0.82 },
    angle: 58,
    startVelocity: 43,
  });

  confetti({
    ...common,
    particleCount: 70,
    spread: 78,
    origin: { x: 0.78, y: 0.82 },
    angle: 122,
    startVelocity: 43,
  });

  window.setTimeout(() => {
    confetti({
      ...common,
      particleCount: 34,
      spread: 92,
      origin: { x: 0.5, y: 0.55 },
      startVelocity: 28,
    });
  }, 180);
}

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

function terminalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    GHOSTED: "Ghosted",
    EXPIRED: "Expired",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

function matchesQuery(item: Opportunity, query: string) {
  const haystack = [
    item.title,
    item.companyName,
    item.location,
    item.compensation,
    item.stageName,
    item.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
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
  const [rewards, setRewards] = useState<ActiveStageToast[]>([]);
  const [search, setSearch] = useState("");
  const draggingOpportunity = useMemo(
    () => opportunities.find((item) => item.id === draggingId),
    [draggingId, opportunities],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const activeOpportunities = useMemo(
    () => opportunities.filter((item) => item.status === "ACTIVE"),
    [opportunities],
  );
  const listedOpportunities = useMemo(() => {
    if (!normalizedSearch) {
      return activeOpportunities;
    }
    return opportunities.filter((item) => matchesQuery(item, normalizedSearch));
  }, [activeOpportunities, normalizedSearch, opportunities]);
  const showList = view === "list" || Boolean(normalizedSearch);

  async function move(opportunityId: string, stageId: string) {
    if (draggingOpportunity?.stageId === stageId) {
      setDraggingId(null);
      setDragOverStageId(null);
      return;
    }
    const stage = stages.find((item) => item.id === stageId);
    const opportunity =
      draggingOpportunity ??
      opportunities.find((item) => item.id === opportunityId);
    await fetch(`/api/opportunities/${opportunityId}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    setDraggingId(null);
    setDragOverStageId(null);
    setLandedStageId(stageId);
    const stageToast = createStageToast({ stage, opportunity });
    setRewards((items) => [stageToast, ...items].slice(0, 4));
    if (stage?.slug === "offer") {
      void celebrateOffer();
    }
    window.setTimeout(() => setLandedStageId(null), 900);
    window.setTimeout(() => {
      setRewards((items) => items.filter((item) => item.id !== stageToast.id));
    }, toastDurationMs);
    router.refresh();
  }

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex h-10 min-w-0 items-center rounded-lg border border-line bg-panel px-3 text-sm ring-accent/30 transition focus-within:ring-2 md:w-80">
          <span className="sr-only">Search saved roles</span>
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the trail, including endings"
            type="search"
          />
        </label>
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

      <ul className={`mt-4 flex flex-col gap-3 ${showList ? "" : "md:hidden"}`}>
        {listedOpportunities.map((item) => (
          <li key={item.id}>
            <OpportunityCard item={item} dragging={false} />
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-accent" />
                {item.stageName}
              </span>
              {item.status !== "ACTIVE" ? (
                <span className="inline-flex items-center rounded-full border border-line bg-panel-soft px-2.5 py-1 text-xs text-muted">
                  {terminalStatusLabel(item.status)}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {listedOpportunities.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-panel p-5 text-sm text-muted">
          {normalizedSearch
            ? "Nothing found. Either it never happened, or it has learned to hide."
            : "No active roles on the trail right now."}
        </div>
      ) : null}

      {!normalizedSearch && view === "board" ? (
        <div className="mt-4 hidden gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
          {stages.map((stage) => {
            const items = activeOpportunities.filter(
              (item) => item.stageId === stage.id,
            );
            const armed = dragOverStageId === stage.id;
            const landed = landedStageId === stage.id;
            const canDrop =
              Boolean(draggingId) && draggingOpportunity?.stageId !== stage.id;
            const terminalDrop =
              stage.slug === "rejected" || stage.slug === "ghosted";
            return (
              <section
                key={stage.id}
                aria-label={`${stage.name} stage`}
                className={`relative min-h-72 rounded-lg border bg-panel-soft/70 p-3 transition ${
                  armed && canDrop
                    ? terminalDrop
                      ? "border-danger/60 bg-danger/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--danger)_82%,transparent),0_18px_50px_-36px_var(--danger)]"
                      : "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--accent),0_18px_50px_-36px_var(--accent)]"
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
                        ? terminalDrop
                          ? "Release to let it leave the trail"
                          : "Release to file"
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
                    Empty. Peaceful. Therefore suspicious.
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
      {rewards.map((reward, index) => (
        <div
          className={`stage-reward-toast fixed left-1/2 z-30 w-[min(calc(100%-2rem),25rem)] -translate-x-1/2 overflow-hidden rounded-xl border bg-panel px-4 py-3 text-sm shadow-[0_18px_60px_-28px_var(--shadow-soft)] ${
            reward.tone === "warning"
              ? "border-danger/45"
              : reward.tone === "victory"
                ? "border-accent/55"
                : "border-accent/40"
          }`}
          key={reward.id}
          style={
            {
              bottom: `calc(1.25rem + ${index * 5.35}rem)`,
              "--toast-lift": `${index * 0.15}rem`,
            } as CSSProperties
          }
        >
          <div className="stage-toast-needle" aria-hidden />
          <div className="relative flex items-start gap-3">
            <span
              className={`mt-1 size-2.5 shrink-0 rounded-full ${
                reward.tone === "warning" ? "bg-danger" : "bg-accent"
              }`}
            />
            <div className="min-w-0">
              <p className="font-semibold">{reward.title}</p>
              <p className="mt-1 text-muted">{reward.body}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
