"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";

type Mode = "casual" | "ekspert" | "kreatywny";
type ModelKey = "flash" | "pro";

const MODES: { key: Mode; label: string; emoji: string }[] = [
  { key: "casual", label: "Casual", emoji: "💬" },
  { key: "ekspert", label: "Ekspert", emoji: "🎓" },
  { key: "kreatywny", label: "Kreatywny", emoji: "🎨" },
];

const MODE_BADGE_STYLES: Record<Mode, string> = {
  casual: "bg-[#333] text-[#ccc]",
  ekspert: "bg-[#1e3a5f] text-[#9ecbff]",
  kreatywny: "bg-[#3a1e5f] text-[#d3b3ff]",
};

const MODELS: { key: ModelKey; label: string; emoji: string }[] = [
  { key: "flash", label: "Flash", emoji: "⚡" },
  { key: "pro", label: "Pro", emoji: "🧠" },
];

const EXAMPLE_QUESTIONS = [
  "Jak rozliczyć VAT przy imporcie towarów spoza UE?",
  "Co potrzebuję do założenia magazynu partnerskiego za granicą?",
  "Jakie dokumenty celne są wymagane przy eksporcie do UK?",
  "Jak wygląda proces odprawy celnej krok po kroku?",
];

export default function Home() {
  const { messages, sendMessage, setMessages, status } = useChat();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("casual");
  const [turnModes, setTurnModes] = useState<Mode[]>([]);
  const [model, setModel] = useState<ModelKey>("flash");
  const [turnModels, setTurnModels] = useState<ModelKey[]>([]);
  const [contextOpen, setContextOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  const approxTokens = Math.round(
    messages.reduce(
      (sum, m) =>
        sum +
        m.parts.reduce(
          (s, p) => s + (p.type === "text" ? p.text.length : 0),
          0,
        ),
      0,
    ) / 4,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setTurnModes((prev) => [...prev, mode]);
    setTurnModels((prev) => [...prev, model]);
    sendMessage({ text: input }, { body: { mode, model } });
    setInput("");
  }

  function handleNewConversation() {
    setMessages([]);
    setTurnModes([]);
    setTurnModels([]);
  }

  async function handleExport() {
    const text = messages
      .map((m) => {
        const content = m.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("");
        return `${m.role === "user" ? "User" : "Agent"}: ${content}`;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied — silently ignore, button stays as-is
    }
  }

  let assistantIndex = -1;

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-[800px] flex-1 flex-col p-4">
      <header className="flex items-center gap-2 border-b border-[#333] pb-4">
        <span className="text-2xl">📦</span>
        <div>
          <h1 className="text-xl font-semibold">
            Marta Wiśniewska — Specjalistka ds. Compliance
          </h1>
          <p className="text-sm text-[#888]">
            Ekspertka od customs compliance, VAT i magazynów partnerskich. Zapytaj mnie o...
          </p>
        </div>
      </header>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[#333] py-3">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-lg border border-[#333] px-3 py-1.5 text-left text-xs text-[#ccc] hover:border-[#555]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-[#333] py-2 text-sm">
        <button
          type="button"
          onClick={() => setContextOpen((open) => !open)}
          className="flex w-full items-center justify-between text-[#888]"
        >
          <span>Kontekst rozmowy {contextOpen ? "▾" : "▸"}</span>
          <span>
            Wiadomości: {messages.length} | ~Tokeny: {approxTokens}
          </span>
        </button>
        {contextOpen && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleNewConversation}
              disabled={messages.length === 0}
              className="rounded-lg border border-[#333] px-3 py-1 text-xs text-[#ccc] hover:border-[#555] disabled:opacity-50"
            >
              🗑 Nowa rozmowa
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={messages.length === 0}
              className="rounded-lg border border-[#333] px-3 py-1 text-xs text-[#ccc] hover:border-[#555] disabled:opacity-50"
            >
              {copied ? "Skopiowano!" : "📋 Eksportuj rozmowę"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((message) => {
          if (message.role === "assistant") assistantIndex++;
          const badgeMode =
            message.role === "assistant" ? turnModes[assistantIndex] : undefined;
          const badgeModel =
            message.role === "assistant" ? turnModels[assistantIndex] : undefined;

          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 ${
                  message.role === "user"
                    ? "bg-[#2a2a3a]"
                    : "border border-[#333] bg-[#1a1a2a]"
                }`}
              >
                {(badgeMode || badgeModel) && (
                  <div className="mb-1 flex gap-1">
                    {badgeMode && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs ${MODE_BADGE_STYLES[badgeMode]}`}
                      >
                        {MODES.find((m) => m.key === badgeMode)?.emoji} {badgeMode}
                      </span>
                    )}
                    {badgeModel && (
                      <span className="inline-block rounded-full bg-[#2a2a3a] px-2 py-0.5 text-xs text-[#ccc]">
                        {MODELS.find((m) => m.key === badgeModel)?.emoji}{" "}
                        {badgeModel}
                      </span>
                    )}
                  </div>
                )}
                <div>
                  {message.parts.map((part, i) =>
                    part.type === "text" ? <span key={i}>{part.text}</span> : null,
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl border border-[#333] bg-[#1a1a2a] px-4 py-2 text-[#a0a0a0]">
              Myślę...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              mode === m.key
                ? "border border-[#7a5cff] bg-[#2a2a3a] text-[#ededed]"
                : "border border-[#333] text-[#888] hover:border-[#555]"
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
        <span className="mx-1 text-[#444]">|</span>
        {MODELS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setModel(m.key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              model === m.key
                ? "border border-[#4caf82] bg-[#2a2a3a] text-[#ededed]"
                : "border border-[#333] text-[#888] hover:border-[#555]"
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#333] pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napisz wiadomość..."
          className="flex-1 rounded-xl border border-[#333] bg-[#1a1a2a] px-4 py-2 text-[#ededed] outline-none focus:border-[#555]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-[#2a2a3a] px-4 py-2 font-medium text-[#ededed] disabled:opacity-50"
        >
          Wyślij
        </button>
      </form>
    </div>
  );
}
