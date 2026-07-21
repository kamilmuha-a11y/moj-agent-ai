"use client";

import { useChat } from "@ai-sdk/react";
import { getToolName, isToolUIPart } from "ai";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useImageAttachment } from "../useImageAttachment";
import { supabase } from "../../lib/supabase";
import { splitCitation } from "../tool-ui";

type Mode = "casual" | "ekspert" | "kreatywny";
type ModelKey = "flash" | "pro";

const MODES: { key: Mode; label: string; emoji: string }[] = [
  { key: "casual", label: "Casual", emoji: "💬" },
  { key: "ekspert", label: "Ekspert", emoji: "🎓" },
  { key: "kreatywny", label: "Kreatywny", emoji: "🎨" },
];

const MODE_BADGE_STYLES: Record<Mode, string> = {
  casual: "bg-[#2a3142] text-[#c3cad8]",
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

function truncateTitle(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed;
}

export default function Chat() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversationId");
  const conversationIdRef = useRef<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<Record<string, string>>({});
  const greetedRef = useRef(false);
  const { messages, sendMessage, setMessages, status, error } = useChat({
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (text) {
        persistAssistantMessage(text).catch((err) =>
          console.error("Nie udało się zapisać odpowiedzi agenta:", err),
        );
      }

      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state !== "output-available") continue;
        const toolName = getToolName(part);
        if (toolName === "saveUserName") {
          const output = part.output as { success: boolean; name?: string };
          if (output.success && output.name) setUserName(output.name);
        }
        if (toolName === "saveUserPreference") {
          const output = part.output as { success: boolean; key?: string; value?: string };
          if (output.success && output.key && output.value) {
            setUserPreferences((prev) => ({ ...prev, [output.key!]: output.value! }));
          }
        }
      }
    },
  });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("casual");
  const [turnModes, setTurnModes] = useState<Mode[]>([]);
  const [model, setModel] = useState<ModelKey>("flash");
  const [turnModels, setTurnModels] = useState<ModelKey[]>([]);
  const [contextOpen, setContextOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachment = useImageAttachment();

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    (async () => {
      let conversation = null;
      if (requestedConversationId) {
        const { data } = await supabase
          .from("conversations")
          .select("id, title, updated_at")
          .eq("id", requestedConversationId)
          .maybeSingle();
        conversation = data;
      }
      if (!conversation) {
        const { data } = await supabase
          .from("conversations")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        conversation = data;
      }

      if (conversation) {
        conversationIdRef.current = conversation.id;
        const { data: messageRows } = await supabase
          .from("messages")
          .select("id, role, content")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true });

        if (messageRows && messageRows.length > 0) {
          setMessages(
            messageRows.map((row) => ({
              id: row.id,
              role: row.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: row.content }],
            })),
          );
        }
      }

      setHistoryLoading(false);
    })();
  }, [setMessages, requestedConversationId]);

  useEffect(() => {
    (async () => {
      let id = localStorage.getItem("user_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("user_id", id);
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, preferences")
        .eq("id", id)
        .maybeSingle();

      if (profile) {
        setUserName(profile.name ?? null);
        setUserPreferences((profile.preferences as Record<string, string>) ?? {});
      } else {
        await supabase.from("user_profiles").insert({ id });
      }

      setUserId(id);
      setProfileLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (historyLoading || profileLoading || greetedRef.current) return;
    greetedRef.current = true;
    if (messages.length === 0) {
      const greeting = userName
        ? `Cześć, ${userName}! Miło Cię znowu widzieć! 🎉`
        : "Cześć! Nie znamy się jeszcze. Jak masz na imię?";
      setMessages([
        { id: "greeting", role: "assistant", parts: [{ type: "text" as const, text: greeting }] },
      ]);
    }
  }, [historyLoading, profileLoading, messages.length, userName, setMessages]);

  async function ensureConversationId(firstMessageText: string): Promise<string> {
    if (conversationIdRef.current) return conversationIdRef.current;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title: truncateTitle(firstMessageText) })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Nie udało się utworzyć rozmowy");
    conversationIdRef.current = data.id;
    return data.id;
  }

  async function persistUserMessage(text: string) {
    const conversationId = await ensureConversationId(text);
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content: text });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  async function persistAssistantMessage(text: string) {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: text });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

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
    if ((!input.trim() && !attachment.image) || isLoading) return;
    const text = input;
    setTurnModes((prev) => [...prev, mode]);
    setTurnModels((prev) => [...prev, model]);
    sendMessage(
      {
        text: input,
        files: attachment.image
          ? [{ type: "file", mediaType: attachment.image.mediaType, url: attachment.image.url, filename: attachment.image.filename }]
          : undefined,
      },
      { body: { mode, model, userId, userName, userPreferences } },
    );
    setInput("");
    attachment.clear();
    if (text.trim()) {
      persistUserMessage(text).catch((err) =>
        console.error("Nie udało się zapisać wiadomości:", err),
      );
    }
  }

  function handleNewConversation() {
    setMessages([]);
    setTurnModes([]);
    setTurnModels([]);
    conversationIdRef.current = null;
    greetedRef.current = false;
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
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-hidden p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            📦
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Marta Wiśniewska — Specjalistka ds. Compliance
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Ekspertka od customs compliance, VAT i magazynów partnerskich. Zapytaj mnie o...
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

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => setContextOpen((open) => !open)}
          className="flex w-full items-center justify-between text-[var(--text-secondary)]"
        >
          <span className="font-medium text-[var(--foreground)]">
            Kontekst rozmowy {contextOpen ? "▾" : "▸"}
          </span>
          <span className="flex gap-3">
            <span className="rounded-md bg-[var(--panel-alt)] px-2 py-0.5 text-xs">
              Wiadomości: {messages.length}
            </span>
            <span className="rounded-md bg-[var(--panel-alt)] px-2 py-0.5 text-xs">
              ~Tokeny: {approxTokens}
            </span>
          </span>
        </button>
        {contextOpen && (
          <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={handleNewConversation}
              disabled={messages.length === 0}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              🗑 Nowa rozmowa
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={messages.length === 0}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-40"
            >
              {copied ? "Skopiowano!" : "📋 Eksportuj rozmowę"}
            </button>
          </div>
        )}
      </div>

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
          {historyLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
              ⏳ Wczytywanie rozmowy...
            </div>
          )}
          {!historyLoading && messages.map((message) => {
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
                  className={`max-w-[75%] whitespace-pre-wrap rounded-lg px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] bg-[var(--panel-alt)]"
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
                        <span className="inline-block rounded-full bg-[var(--panel-bg)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                          {MODELS.find((m) => m.key === badgeModel)?.emoji}{" "}
                          {badgeModel}
                        </span>
                      )}
                    </div>
                  )}
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
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--text-secondary)]">
                Myślę...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-3">
        <div className="flex flex-wrap gap-1.5 rounded-md bg-[var(--panel-alt)] p-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m.key
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-md bg-[var(--panel-alt)] p-1">
          {MODELS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setModel(m.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                model === m.key
                  ? "bg-[var(--success)] text-[#04241a] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
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
          placeholder="Napisz wiadomość..."
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
