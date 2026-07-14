"use client";

import { countErrors, countToolCalls, TimelineStep, TOOL_META } from "./tool-ui";

type DiagnosticsStatus = "idle" | "loading" | "done";

export function DiagnosticsPanel({
  timeline,
  maxSteps,
  elapsedSeconds,
  status,
}: {
  timeline: TimelineStep[];
  maxSteps: number;
  elapsedSeconds: number | null;
  status: DiagnosticsStatus;
}) {
  const stepCount = timeline.length;
  const errorCount = countErrors(timeline);
  const toolCounts = countToolCalls(timeline);
  const hitLimit = status === "done" && stepCount >= maxSteps;

  const barColor =
    stepCount <= 3
      ? "bg-[var(--success)]"
      : stepCount === 4
        ? "bg-amber-400"
        : "bg-red-400";

  const statusLabel = hitLimit
    ? "⚠️ Limit kroków"
    : status === "loading"
      ? "⏳ W trakcie..."
      : status === "done"
        ? "✅ Zadanie ukończone"
        : "— Oczekuję na zadanie";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4 text-xs">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
        🛡️ Diagnostyka
      </p>

      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[var(--text-secondary)]">
          <span>Kroki</span>
          <span>
            {stepCount}/{maxSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-alt)]">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min((stepCount / maxSteps) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {Object.keys(toolCounts).length === 0 && (
          <span className="text-[var(--text-secondary)]">Narzędzia: brak</span>
        )}
        {Object.entries(toolCounts).map(([name, count]) => {
          const meta =
            name === "google_search"
              ? { emoji: "🌐", label: "Google Search" }
              : (TOOL_META[name] ?? { emoji: "🔧", label: name });
          return (
            <span
              key={name}
              className="rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-2 py-1 text-[var(--text-secondary)]"
            >
              {meta.emoji} {meta.label}({count})
            </span>
          );
        })}
      </div>

      <p className={`mb-1 ${errorCount > 0 ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
        Błędy: {errorCount}
      </p>

      {elapsedSeconds !== null && (
        <p className="mb-2 text-[var(--text-secondary)]">Czas: {elapsedSeconds.toFixed(1)}s</p>
      )}

      <p className="border-t border-[var(--border)] pt-2 font-medium text-[var(--foreground)]">
        Status: {statusLabel}
      </p>

      {errorCount > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border)] pt-2">
          {timeline
            .filter(
              (step): step is Extract<TimelineStep, { kind: "tool" }> =>
                step.kind === "tool" &&
                step.state === "output-available" &&
                typeof step.output === "string" &&
                countErrors([step]) === 1,
            )
            .map((step, i) => (
              <p key={i} className="text-red-400">
                🔴 {TOOL_META[step.toolName]?.label ?? step.toolName} — {String(step.output)}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
