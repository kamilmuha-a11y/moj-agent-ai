"use client";

import { useChat } from "@ai-sdk/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useImageAttachment } from "../useImageAttachment";
import { splitCitation } from "../tool-ui";

const EXAMPLE_QUESTIONS = [
  "Jakie są najnowsze wiadomości o sztucznej inteligencji?",
  "Ile kosztuje iPhone 16 Pro w Polsce?",
  "Kto wygrał ostatni mecz reprezentacji Polski?",
  "Jakie filmy są teraz w kinach?",
];

export default function Search() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachment = useImageAttachment();

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !attachment.image) || isLoading) return;
    sendMessage({
      text: input,
      files: attachment.image
        ? [{ type: "file", mediaType: attachment.image.mediaType, url: attachment.image.url, filename: attachment.image.filename }]
        : undefined,
    });
    setInput("");
    attachment.clear();
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-hidden p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            🌐
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Agent z wyszukiwarką
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Przeszukuję prawdziwy internet i czytam strony
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
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {q}
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
            const sources = message.parts.filter(
              (p) => p.type === "source-url",
            );

            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-lg px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--panel-alt)]"
                  }`}
                >
                  <div>
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        const { body, label, citation } = splitCitation(part.text);
                        return (
                          <Fragment key={i}>
                            <span>{body}</span>
                            {citation && (
                              <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--border)] pt-2 text-xs text-[var(--text-secondary)]">
                                <span>📎</span>
                                <span>
                                  {label}: {citation}
                                </span>
                              </div>
                            )}
                          </Fragment>
                        );
                      }
                      if (part.type === "file" && part.mediaType.startsWith("image/"))
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
                  {sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2">
                      {sources.map((source) => (
                        <a
                          key={source.sourceId}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-[var(--panel-bg)] px-2 py-1 text-xs text-[var(--accent)] transition-colors hover:text-[var(--foreground)]"
                        >
                          🔗 {source.title || source.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                Szukam...
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
          placeholder="Zapytaj o cokolwiek aktualnego..."
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
  );
}
