"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useImageAttachment } from "../useImageAttachment";
import { DiagnosticsPanel } from "../diagnostics-panel";
import { buildTimeline, downloadImage, summarizeOutput, TOOL_META } from "../tool-ui";
import { useLiveElapsed } from "../use-live-elapsed";

const MAX_STEPS = 8;

const TOOLS_PANEL = [
  { emoji: "🧮", label: "Kalkulator" },
  { emoji: "🕐", label: "Data i czas" },
  { emoji: "🌐", label: "Google Search" },
  { emoji: "📄", label: "Czytanie stron" },
  { emoji: "🎨", label: "Generowanie obrazów" },
  { emoji: "👁️", label: "Analiza obrazów" },
];

const SCENARIOS = [
  "Znajdź w Google co robi firma Syntelligence i wygeneruj dla nich logo",
  "Przeczytaj stronę apple.com i opisz ich aktualną ofertę iPhone",
  "Ile to 23% VAT z 8500 PLN? Podaj kwotę brutto i netto",
  "Jakie są najnowsze wiadomości o AI? Wygeneruj grafikę do posta o tym",
  "Wyszukaj w Google 'best coffee shops Kraków' i streszcz wyniki",
];

export default function Agent() {
  const [turnDurations, setTurnDurations] = useState<number[]>([]);
  const turnStartRef = useRef<number | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    onFinish: () => {
      if (turnStartRef.current !== null) {
        const duration = (Date.now() - turnStartRef.current) / 1000;
        turnStartRef.current = null;
        setTurnDurations((prev) => [...prev, duration]);
      }
    },
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachment = useImageAttachment();

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function sendWithAttachment(text: string) {
    if ((!text.trim() && !attachment.image) || isLoading) return;
    turnStartRef.current = Date.now();
    sendMessage({
      text,
      files: attachment.image
        ? [
            {
              type: "file",
              mediaType: attachment.image.mediaType,
              url: attachment.image.url,
              filename: attachment.image.filename,
            },
          ]
        : undefined,
    });
    setInput("");
    attachment.clear();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendWithAttachment(input);
  }

  let assistantIndex = -1;
  const lastMessage = messages[messages.length - 1];
  const diagTimeline =
    lastMessage?.role === "assistant" ? buildTimeline(lastMessage.parts) : [];
  const liveElapsed = useLiveElapsed(isLoading, turnStartRef);

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 gap-4 overflow-hidden p-6">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            🤖
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Agent AI - Pełna moc
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {TOOLS_PANEL.length} narzędzi • autonomiczne decyzje
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Online
        </span>
      </header>

      <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        {TOOLS_PANEL.map((t) => (
          <span
            key={t.label}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            {t.emoji} {t.label} <span className="text-[var(--success)]">✅</span>
          </span>
        ))}
      </div>

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

      <div
        onDragOver={attachment.handleDragOver}
        onDragLeave={attachment.handleDragLeave}
        onDrop={attachment.handleDrop}
        className="relative flex flex-1 flex-col overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4"
      >
        {attachment.isDragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] text-sm font-medium text-[var(--accent)]">
            Upuść obraz
          </div>
        )}
        <div className="flex-1 space-y-3">
          {messages.map((message) => {
            if (message.role === "assistant") assistantIndex++;
            const timeline =
              message.role === "assistant" ? buildTimeline(message.parts) : [];
            const duration =
              message.role === "assistant"
                ? turnDurations[assistantIndex]
                : undefined;
            const toolCount = timeline.length;

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--panel-alt)]"
                  }`}
                >
                  {timeline.length > 0 && (
                    <div className="mb-2 flex flex-col gap-1.5">
                      {timeline.map((step, idx) => {
                        const n = idx + 1;
                        if (step.kind === "search") {
                          return (
                            <div
                              key={idx}
                              className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-2.5 text-xs"
                            >
                              <p className="font-medium text-[var(--foreground)]">
                                {n} 🌐 Google Search
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
                              {n} {meta.emoji} {meta.label}
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
                                    onClick={() =>
                                      downloadImage(imageOutput.image!)
                                    }
                                    className="rounded-lg border border-[var(--border)] px-2 py-1 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                                  >
                                    💾 Pobierz
                                  </button>
                                </div>
                              ) : (
                                <p className="text-red-400">
                                  {imageOutput.message ||
                                    "Nie udało się wygenerować obrazu."}
                                </p>
                              ))}
                            {isDone && !imageOutput && (
                              <p className="mt-1 text-[var(--text-secondary)]">
                                → {summarizeOutput(step.output)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    {message.parts.map((part, i) => {
                      if (part.type === "text")
                        return <span key={i}>{part.text}</span>;
                      if (
                        part.type === "file" &&
                        part.mediaType.startsWith("image/")
                      )
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={part.url}
                            alt={part.filename || "Załączony obraz"}
                            className="mt-2 max-h-48 rounded-lg border border-[var(--border)]"
                          />
                        );
                      return null;
                    })}
                  </div>

                  {message.role === "assistant" && duration !== undefined && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Użyto {toolCount} narzędzi | {duration.toFixed(1)}s |
                      Model: gemini-3.1-flash-lite
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                Działam...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {attachment.error && (
        <p className="-mt-2 text-xs text-red-400">{attachment.error}</p>
      )}

      {attachment.image && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.image.url}
            alt="Podgląd załącznika"
            className="max-h-[120px] rounded-lg border border-[var(--border)]"
          />
          <span className="flex-1 text-sm text-[var(--text-secondary)]">
            📎 Screenshot - zadaj pytanie o ten obraz
          </span>
          <button
            type="button"
            onClick={attachment.clear}
            className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          ⚠️ {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={attachment.handleFileInput}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          📎
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={attachment.handlePaste}
          placeholder="Napisz zadanie dla agenta..."
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !attachment.image)}
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
