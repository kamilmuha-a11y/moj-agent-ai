"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, UIMessage } from "ai";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../markdown-components";
import { DiagnosticsPanel } from "../diagnostics-panel";
import { buildTimeline, downloadImage, summarizeOutput, TOOL_META } from "../tool-ui";
import { useLiveElapsed } from "../use-live-elapsed";

const MAX_STEPS = 8;

const SCENARIOS = [
  "Planuję weekend w Krakowie. Sprawdź pogodę, znajdź ciekawe miejsca w Wikipedii, i powiedz czy są jakieś święta w ten weekend",
  "Mam 5000 EUR do wydania. Przelicz na PLN, sprawdź ile to w dolarach, i zapisz wszystkie kursy w notatkach",
  "Porównaj pogodę w Warszawie, Berlinie i Paryżu. Który z tych miast ma dziś najlepszą pogodę?",
  "Ile dni do następnego święta w Polsce? Jaka będzie wtedy pogoda?",
];

type SegKind = "thought" | "observation" | "result" | "plain";

const SEGMENT_META: Record<
  SegKind,
  { className: string; label: string; emoji: string }
> = {
  thought: {
    className: "bg-[#1a1a3a] border-[var(--accent)]",
    label: "Myślę...",
    emoji: "🧠",
  },
  observation: {
    className: "bg-[#2a1a0a] border-[#f59e0b]",
    label: "Obserwuję...",
    emoji: "👁️",
  },
  result: {
    className: "bg-[#0a2a0a] border-[var(--success)]",
    label: "Wynik końcowy",
    emoji: "✅",
  },
  plain: {
    className: "bg-[var(--panel-alt)] border-[var(--border)]",
    label: "",
    emoji: "",
  },
};

type ReactStep =
  | { kind: "text"; segKind: SegKind; text: string }
  | { kind: "tool"; toolName: string; state: string; output: unknown }
  | { kind: "search"; sources: { sourceId: string; url: string; title?: string }[] };

function splitTextSegments(text: string): { kind: SegKind; body: string }[] {
  const headingRe = /###\s*(🧠|👁️|✅)[^\n]*\n?/g;
  const matches: { index: number; kind: SegKind; headingEnd: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(text))) {
    const emoji = match[1];
    const kind: SegKind =
      emoji === "🧠" ? "thought" : emoji === "👁️" ? "observation" : "result";
    matches.push({ index: match.index, kind, headingEnd: match.index + match[0].length });
  }

  if (matches.length === 0) {
    const body = text.trim();
    return body ? [{ kind: "plain", body }] : [];
  }

  const segments: { kind: SegKind; body: string }[] = [];
  if (matches[0].index > 0) {
    const lead = text.slice(0, matches[0].index).trim();
    if (lead) segments.push({ kind: "plain", body: lead });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].headingEnd;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    if (body) segments.push({ kind: matches[i].kind, body });
  }
  return segments;
}

function buildReactTimeline(parts: UIMessage["parts"]): ReactStep[] {
  const steps: ReactStep[] = [];
  let sourcesAdded = false;
  for (const part of parts) {
    if (part.type === "text") {
      for (const seg of splitTextSegments(part.text)) {
        steps.push({ kind: "text", segKind: seg.kind, text: seg.body });
      }
    } else if (isToolUIPart(part)) {
      steps.push({
        kind: "tool",
        toolName: getToolName(part),
        state: part.state,
        output: "output" in part ? part.output : undefined,
      });
    } else if (part.type === "source-url" && !sourcesAdded) {
      sourcesAdded = true;
      steps.push({
        kind: "search",
        sources: parts.filter((p) => p.type === "source-url") as {
          sourceId: string;
          url: string;
          title?: string;
        }[],
      });
    }
  }
  return steps;
}

export default function ReactAgent() {
  return (
    <Suspense fallback={null}>
      <ReactAgentInner />
    </Suspense>
  );
}

function ReactAgentInner() {
  const searchParams = useSearchParams();
  const [turnDurations, setTurnDurations] = useState<number[]>([]);
  const turnStartRef = useRef<number | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/react" }),
    onFinish: () => {
      if (turnStartRef.current !== null) {
        setTurnDurations((prev) => [...prev, (Date.now() - turnStartRef.current!) / 1000]);
        turnStartRef.current = null;
      }
    },
  });
  const [input, setInput] = useState(searchParams.get("prompt") ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    turnStartRef.current = Date.now();
    sendMessage({ text: input });
    setInput("");
  }

  const lastMessage = messages[messages.length - 1];
  const lastIsAssistant = lastMessage?.role === "assistant";
  const liveTimeline = lastIsAssistant ? buildReactTimeline(lastMessage.parts) : [];
  const liveStepCount = liveTimeline.filter(
    (s) => s.kind === "text" && s.segKind === "thought",
  ).length;
  const diagTimeline = lastIsAssistant ? buildTimeline(lastMessage.parts) : [];
  const liveElapsed = useLiveElapsed(isLoading, turnStartRef);

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 gap-4 overflow-hidden p-6">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            🔄
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Agent ReAct — Autonomiczne rozumowanie
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Opisz cel → agent sam planuje i realizuje
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Online
        </span>
      </header>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Krok {Math.max(liveStepCount, 1)} z 5</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-alt)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.min((Math.max(liveStepCount, 1) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        <div className="flex-1 space-y-3">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-[var(--accent)] px-4 py-2.5 text-white">
                    {message.parts.map((part, i) =>
                      part.type === "text" ? <span key={i}>{part.text}</span> : null,
                    )}
                  </div>
                </div>
              );
            }

            const timeline = buildReactTimeline(message.parts);

            return (
              <div key={message.id} className="flex justify-start">
                <div className="flex max-w-[90%] flex-col gap-2">
                  {timeline.map((step, idx) => {
                    if (step.kind === "text") {
                      const meta = SEGMENT_META[step.segKind];
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 text-sm ${meta.className} ${
                            idx > 0 ? "border-t-2" : ""
                          }`}
                        >
                          {meta.label && (
                            <p className="mb-1 text-xs font-semibold text-[var(--foreground)]">
                              {meta.emoji} {meta.label}
                            </p>
                          )}
                          <div className="text-[var(--foreground)]">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {step.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    }

                    if (step.kind === "search") {
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-2.5 text-xs"
                        >
                          <p className="font-medium text-[var(--foreground)]">
                            ⚡ 🌐 Google Search
                          </p>
                          <p className="text-[var(--text-secondary)]">
                            → znaleziono {step.sources.length} wyników
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {step.sources.map((s) => (
                              <a
                                key={s.sourceId}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[var(--panel-alt)] px-2 py-1 text-[var(--accent)] transition-colors hover:text-[var(--foreground)]"
                              >
                                🔗 {s.title || s.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    const meta = TOOL_META[step.toolName] ?? {
                      emoji: "🔧",
                      label: step.toolName,
                    };
                    const isDone = step.state === "output-available";
                    const imageOutput =
                      step.toolName === "generateImage" && isDone
                        ? (step.output as {
                            success?: boolean;
                            image?: string;
                            message?: string;
                          })
                        : null;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-2.5 text-xs"
                      >
                        <p className="font-medium text-[var(--foreground)]">
                          ⚡ {meta.emoji} {meta.label}
                          {!isDone && (
                            <span className="ml-2 animate-pulse text-[var(--text-secondary)]">
                              wykonuję...
                            </span>
                          )}
                        </p>
                        {imageOutput &&
                          (imageOutput.success && imageOutput.image ? (
                            <div className="mt-1.5 flex flex-col items-start gap-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageOutput.image}
                                alt="Wygenerowany obraz"
                                className="max-h-56 rounded-lg border border-[var(--border)]"
                              />
                              <button
                                type="button"
                                onClick={() => downloadImage(imageOutput.image!)}
                                className="rounded-lg border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                              >
                                💾 Pobierz
                              </button>
                            </div>
                          ) : (
                            <p className="text-red-400">
                              {imageOutput.message || "Nie udało się wygenerować obrazu."}
                            </p>
                          ))}
                        {isDone && !imageOutput && (
                          <p className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">
                            → {summarizeOutput(step.output)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {isLoading && lastMessage?.role === "user" && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                🧠 Planuję...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {error && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          ⚠️ {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Opisz co chcesz osiągnąć..."
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
        >
          Wyślij
        </button>
      </form>
    </div>

    <div className="hidden w-72 shrink-0 lg:block">
      <DiagnosticsPanel
        timeline={diagTimeline}
        maxSteps={MAX_STEPS}
        elapsedSeconds={isLoading ? liveElapsed : (turnDurations[turnDurations.length - 1] ?? null)}
        status={isLoading ? "loading" : messages.length > 0 ? "done" : "idle"}
      />
    </div>
    </div>
  );
}
