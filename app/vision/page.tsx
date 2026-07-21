"use client";

import { useChat } from "@ai-sdk/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useImageAttachment } from "../useImageAttachment";
import { useAuth } from "../auth-context";
import { splitCitation } from "../tool-ui";

const EXAMPLE_QUESTIONS = [
  "Co widzisz na tym obrazie?",
  "Wyciągnij cały tekst z tego screena",
  "Opisz to w 3 zdaniach",
  "Jakie kolory dominują? Podaj kody HEX",
  "Wygeneruj podobny obraz w innym stylu",
];

export default function Vision() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { messages, sendMessage, status, error: chatError } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachment = useImageAttachment();

  const [remix, setRemix] = useState<{ image: string; text: string } | null>(
    null,
  );
  const [remixLoading, setRemixLoading] = useState(false);
  const [remixError, setRemixError] = useState("");

  const isLoading = status === "submitted" || status === "streaming";
  const hasImage = Boolean(attachment.image);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function sendWithImage(text: string) {
    if (!text.trim() || isLoading || !attachment.image) return;
    sendMessage(
      {
        text,
        files: [
          {
            type: "file",
            mediaType: attachment.image.mediaType,
            url: attachment.image.url,
            filename: attachment.image.filename,
          },
        ],
      },
      { body: { userId } },
    );
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendWithImage(input);
  }

  async function handleGenerateSimilar() {
    if (!attachment.image || remixLoading) return;
    setRemixLoading(true);
    setRemixError("");
    setRemix(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Opisz co widzisz na dołączonym obrazie, a następnie stwórz podobny obraz w innym stylu.",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRemixError(data.error || "Nie udało się wygenerować obrazu.");
      } else {
        setRemix(data);
      }
    } catch {
      setRemixError("Nie udało się połączyć z serwerem.");
    } finally {
      setRemixLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            👁️
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Agent Vision
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Wklej screenshot, wrzuć plik lub przeciągnij obraz
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Online
        </span>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={attachment.handleFileInput}
        className="hidden"
      />

      {!hasImage && messages.length === 0 ? (
        <div
          onDragOver={attachment.handleDragOver}
          onDragLeave={attachment.handleDragLeave}
          onDrop={attachment.handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onPaste={attachment.handlePaste}
          tabIndex={0}
          className={`card-fade-in flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-10 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            attachment.isDragging
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border)] bg-[var(--panel-bg)]"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-3xl">
            🖼️
          </div>

          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              Dodaj obraz do analizy
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Przeciągnij plik w dowolne miejsce tej karty albo wybierz jedną z opcji poniżej
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-5 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3a1e5f] text-lg text-[#d3b3ff]">
                📋
              </span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Wklej ze schowka
              </span>
              <kbd className="rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                Ctrl+V
              </kbd>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-5 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a5f] text-lg text-[#9ecbff]">
                📁
              </span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Wybierz plik
              </span>
              <span className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-strong)]">
                Przeglądaj
              </span>
            </button>

            <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-5 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success)]/15 text-lg text-[var(--success)]">
                🖱️
              </span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Przeciągnij i upuść
              </span>
              <span className="text-xs text-[var(--text-secondary)]">gdziekolwiek tutaj</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">PNG, JPG, GIF, WEBP · max 4MB</p>
        </div>
      ) : (
        <>
          {hasImage && (
            <div className="card-fade-in flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.image!.url}
                alt="Podgląd załącznika"
                className="h-[88px] w-[88px] shrink-0 rounded-lg border border-[var(--border)] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                    ✓
                  </span>
                  Obraz gotowy do analizy
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                  {attachment.image!.filename || "Wklejony obraz"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  🔄 Zmień
                </button>
                <button
                  type="button"
                  onClick={() => {
                    attachment.clear();
                    setRemix(null);
                    setRemixError("");
                  }}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-red-400 hover:text-red-400"
                >
                  🗑️ Usuń
                </button>
              </div>
            </div>
          )}

          {hasImage && messages.length === 0 && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() =>
                    q === "Wygeneruj podobny obraz w innym stylu"
                      ? handleGenerateSimilar()
                      : sendWithImage(q)
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {(messages.length > 0 || remixLoading || remix || remixError) && (
            <div className="flex flex-1 flex-col overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
              <div className="flex-1 space-y-3">
                {messages.map((message) => (
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
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                      Patrzę...
                    </div>
                  </div>
                )}

                {remixLoading && (
                  <div className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                    Generuję... (5-15 sekund)
                  </div>
                )}

                {remixError && !remixLoading && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-sm text-red-400">
                    {remixError}
                  </div>
                )}

                {remix && !remixLoading && (
                  <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-3">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Oryginał → nowa wersja
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.image?.url}
                        alt="Oryginał"
                        className="max-h-56 rounded-lg border border-[var(--border)]"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={remix.image}
                        alt="Nowa wersja"
                        className="max-h-56 rounded-lg border border-[var(--border)]"
                      />
                    </div>
                    {remix.text && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        {remix.text}
                      </p>
                    )}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {chatError && !isLoading && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              ⚠️ {chatError.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
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
              placeholder="Zadaj pytanie o obraz..."
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !hasImage}
              className="rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
            >
              Wyślij
            </button>
          </form>
        </>
      )}

      {attachment.error && (
        <p className="text-xs text-red-400">{attachment.error}</p>
      )}
    </div>
  );
}
