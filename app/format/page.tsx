"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../markdown-components";

const COMMAND_EXAMPLES = [
  "/tabela języki programowania 2026",
  "/porownanie ChatGPT vs Claude",
  "/lista 5 kroków do pierwszego agenta AI",
  "/faq sztuczna inteligencja dla początkujących",
  "/email podziękowanie za udaną rekrutację",
];

export default function Format() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/format" }),
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-hidden p-6">
      <header className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-2xl">
            📐
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Formatowanie
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Agent odpowiada w tabeli, liście, porównaniu — na żądanie
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
          {COMMAND_EXAMPLES.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => setInput(cmd)}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-left font-mono text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        <div className="flex-1 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === "user"
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] bg-[var(--panel-alt)]"
                }`}
              >
                {message.role === "user" ? (
                  message.parts.map((part, i) =>
                    part.type === "text" ? <span key={i}>{part.text}</span> : null,
                  )
                ) : (
                  <div className="text-sm leading-relaxed">
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
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                Myślę...
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
          placeholder="/tabela, /lista, /porownanie, /faq, /email lub zwykłe pytanie..."
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
  );
}
