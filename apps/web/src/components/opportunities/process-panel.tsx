"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

type Stage = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  dueAt: Date | null;
  completedAt: Date | null;
};
type Interview = {
  id: string;
  scheduledAt: Date;
  type: string;
  round: string | null;
  interviewer: string | null;
  meetingUrl: string | null;
};

const ordealLabels = [
  "Found the door",
  "Sent into the maze",
  "Timed puzzle",
  "Human checkpoint",
  "More humans",
  "Boss room",
  "Offer altar",
  "Rusty bargaining table",
  "Escaped",
];

export function ProcessPanel({
  opportunityId,
  stageId,
  stages,
  tasks,
  interviews,
}: {
  opportunityId: string;
  stageId: string;
  stages: Stage[];
  tasks: Task[];
  interviews: Interview[];
}) {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [interviewType, setInterviewType] = useState("Interview");
  const [interviewer, setInterviewer] = useState("");
  const [movingStageId, setMovingStageId] = useState<string | null>(null);

  const currentIndex = Math.max(
    stages.findIndex((stage) => stage.id === stageId),
    0,
  );
  const previousStage = stages[currentIndex - 1];
  const nextStage = stages[currentIndex + 1];

  async function moveStage(nextStageId: string) {
    if (nextStageId === stageId || movingStageId) {
      return;
    }
    setMovingStageId(nextStageId);
    try {
      await fetch(`/api/opportunities/${opportunityId}/stage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageId: nextStageId }),
      });
      router.refresh();
    } finally {
      setMovingStageId(null);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetch(`/api/opportunities/${opportunityId}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: taskTitle,
        dueAt: taskDue ? new Date(taskDue).toISOString() : null,
      }),
    });
    setTaskTitle("");
    setTaskDue("");
    router.refresh();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await fetch(`/api/opportunities/${opportunityId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    router.refresh();
  }

  async function addInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetch(`/api/opportunities/${opportunityId}/interviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scheduledAt: new Date(interviewAt).toISOString(),
        type: interviewType,
        interviewer: interviewer || undefined,
      }),
    });
    setInterviewAt("");
    setInterviewType("Interview");
    setInterviewer("");
    router.refresh();
  }

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-line bg-panel p-4 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-muted">Stage</h2>
            <p className="mt-1 text-lg font-semibold">
              {stages[currentIndex]?.name ?? "Unknown"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-9 rounded-lg border border-line bg-background px-3 text-sm text-muted disabled:opacity-40"
              disabled={!previousStage || Boolean(movingStageId)}
              onClick={() => previousStage && void moveStage(previousStage.id)}
            >
              Back
            </button>
            <button
              type="button"
              className="h-9 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-50"
              disabled={!nextStage || Boolean(movingStageId)}
              onClick={() => nextStage && void moveStage(nextStage.id)}
            >
              {movingStageId ? "Moving..." : "Next"}
            </button>
          </div>
        </div>

        <div className="mt-4 hidden overflow-x-auto pb-1 md:block">
          <div className="grid auto-cols-[minmax(9rem,1fr)] grid-flow-col gap-2">
            {stages.map((stage, index) => {
              const active = stage.id === stageId;
              const complete = index < currentIndex;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`group relative min-h-20 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-60 ${
                    active
                      ? "border-accent bg-accent text-accent-foreground shadow-[0_14px_30px_-24px_var(--shadow-soft)]"
                      : complete
                        ? "border-accent/40 bg-panel-soft text-foreground"
                        : "border-line bg-background text-muted hover:border-accent/50"
                  }`}
                  disabled={Boolean(movingStageId)}
                  onClick={() => void moveStage(stage.id)}
                >
                  <span
                    className={`mb-2 inline-flex size-6 items-center justify-center rounded-full border text-xs font-semibold ${
                      active
                        ? "border-accent-foreground/50"
                        : "border-line bg-panel"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="block leading-5">{stage.name}</span>
                  <span
                    className={`mt-1 block truncate text-xs ${
                      active ? "text-accent-foreground/80" : "text-muted"
                    }`}
                  >
                    {ordealLabels[index] ?? "Another ledge"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <select
          className="mt-3 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none ring-accent/30 focus:ring-2 md:hidden"
          value={stageId}
          disabled={Boolean(movingStageId)}
          onChange={(event) => void moveStage(event.target.value)}
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-muted">Quick tasks</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Follow up", "Prepare OA", "Send thank-you"].map((title) => (
            <button
              key={title}
              type="button"
              className="h-9 rounded-lg border border-line px-3 text-sm"
              onClick={() => setTaskTitle(title)}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-muted">Tasks</h2>
        <form className="mt-3 grid gap-2" onSubmit={addTask}>
          <input
            className="h-10 rounded-lg border border-line bg-background px-3 text-sm outline-none"
            required
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Next tiny ordeal"
          />
          <input
            className="h-10 rounded-lg border border-line bg-background px-3 text-sm outline-none"
            type="datetime-local"
            value={taskDue}
            onChange={(event) => setTaskDue(event.target.value)}
          />
          <button
            className="h-10 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground"
            type="submit"
          >
            Add task
          </button>
        </form>
        <ul className="mt-4 flex flex-col gap-2">
          {tasks.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={Boolean(item.completedAt)}
                onChange={(event) =>
                  void toggleTask(item.id, event.target.checked)
                }
              />
              <span
                className={item.completedAt ? "text-muted line-through" : ""}
              >
                {item.title}
                {item.dueAt ? (
                  <span className="block text-xs text-muted">
                    Due {formatRelativeTime(item.dueAt)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-sm font-medium text-muted">Interviews</h2>
        <form className="mt-3 grid gap-2" onSubmit={addInterview}>
          <input
            className="h-10 rounded-lg border border-line bg-background px-3 text-sm outline-none"
            type="datetime-local"
            required
            value={interviewAt}
            onChange={(event) => setInterviewAt(event.target.value)}
          />
          <input
            className="h-10 rounded-lg border border-line bg-background px-3 text-sm outline-none"
            value={interviewType}
            onChange={(event) => setInterviewType(event.target.value)}
            placeholder="Technical, recruiter, onsite"
          />
          <input
            className="h-10 rounded-lg border border-line bg-background px-3 text-sm outline-none"
            value={interviewer}
            onChange={(event) => setInterviewer(event.target.value)}
            placeholder="Interviewer"
          />
          <button
            className="h-10 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground"
            type="submit"
          >
            Add interview
          </button>
        </form>
        <ul className="mt-4 flex flex-col gap-2">
          {interviews.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="font-medium">{item.type}</p>
              <p className="text-xs text-muted">
                {new Date(item.scheduledAt).toLocaleString()}
                {item.interviewer ? ` · ${item.interviewer}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
