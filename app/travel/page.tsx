"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../markdown-components";
import { DiagnosticsPanel } from "../diagnostics-panel";
import { buildTimeline, TOOL_META } from "../tool-ui";
import { useLiveElapsed } from "../use-live-elapsed";

const MAX_STEPS = 10;

const SCENARIOS = [
  "Planuję weekend w Berlinie. Budżet: 2000 PLN",
  "Lecę do Paryża na tydzień w sierpniu",
  "Wycieczka do Pragi z rodziną na 3 dni",
  "Podróż służbowa do Londynu w przyszłym tygodniu",
  "Porównaj Barcelonę i Lizbonę na wakacje",
];

export default function Travel() {
  const [turnDurations, setTurnDurations] = useState<number[]>([]);
  const turnStartRef = useRef<number | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/travel" }),
    onFinish: () => {
      if (turnStartRef.current !== null) {
        setTurnDurations((prev) => [...prev, (Date.now() - turnStartRef.current!) / 1000]);
        turnStartRef.current = null;
      }
    },
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    turnStartRef.current = Date.now();
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  const lastMessage = messages[messages.length - 1];
  const lastIsAssistant = lastMessage?.role === "assistant";
  const liveTimeline = lastIsAssistant ? buildTimeline(lastMessage.parts) : [];
  const liveElapsed = useLiveElapsed(isLoading, turnStartRef);

  let assistantIndex = -1;

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-5xl flex-1 gap-4 overflow-hidden p-6">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <header className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-2xl">
              ✈️
            </span>
            <div>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">
                Asystent podróży AI
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Powiedz dokąd jedziesz — agent zaplanuje wszystko
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            Online
          </span>
        </header>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
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

        <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
          <div className="flex-1 space-y-3">
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-white">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? <span key={i}>{part.text}</span> : null,
                      )}
                    </div>
                  </div>
                );
              }

              assistantIndex++;
              const timeline = buildTimeline(message.parts);
              const duration = turnDurations[assistantIndex];

              return (
                <div key={message.id} className="flex justify-start">
                  <div className="flex max-w-[90%] flex-col gap-2">
                    {timeline.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {timeline.map((step, idx) => {
                          if (step.kind === "search") {
                            return (
                              <div
                                key={idx}
                                className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-2.5 text-xs"
                              >
                                <p className="font-medium text-[var(--foreground)]">
                                  🌐 Google Search
                                </p>
                                <p className="text-[var(--text-secondary)]">
                                  → znaleziono {step.sources.length} wyników
                                </p>
                              </div>
                            );
                          }
                          const meta = TOOL_META[step.toolName] ?? {
                            emoji: "🔧",
                            label: step.toolName,
                          };
                          const isDone = step.state === "output-available";
                          return (
                            <div
                              key={idx}
                              className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-2.5 text-xs"
                            >
                              <p className="font-medium text-[var(--foreground)]">
                                {meta.emoji} {meta.label}
                                {!isDone && (
                                  <span className="ml-2 animate-pulse text-[var(--text-secondary)]">
                                    sprawdzam...
                                  </span>
                                )}
                              </p>
                              {isDone && (
                                <p className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">
                                  {typeof step.output === "string" ? step.output : JSON.stringify(step.output)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-3 text-sm leading-relaxed">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? (
                          <ReactMarkdown
                            key={i}
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {part.text}
                          </ReactMarkdown>
                        ) : null,
                      )}
                      {duration !== undefined && (
                        <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--text-secondary)]">
                          {timeline.length} narzędzi | {duration.toFixed(1)}s
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && lastMessage?.role === "user" && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                  🧭 Planuję podróż...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {error && !isLoading && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            ⚠️ {error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Np. Lecę do Barcelony na weekend..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            Wyślij
          </button>
        </form>
      </div>

      <div className="hidden w-72 shrink-0 lg:block">
        <DiagnosticsPanel
          timeline={liveTimeline}
          maxSteps={MAX_STEPS}
          elapsedSeconds={isLoading ? liveElapsed : (turnDurations[turnDurations.length - 1] ?? null)}
          status={isLoading ? "loading" : messages.length > 0 ? "done" : "idle"}
        />
      </div>
    </div>
  );
}
