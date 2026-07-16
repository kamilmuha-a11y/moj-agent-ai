"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ConversationSummary = {
  id: string;
  title: string | null;
  updated_at: string;
  messageCount: number;
  lastMessagePreview: string;
};

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

async function fetchConversationSummaries(): Promise<ConversationSummary[]> {
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

  if (!convos || convos.length === 0) return [];

  const ids = convos.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  const byConvo = new Map<string, { count: number; last: string }>();
  for (const m of msgs ?? []) {
    const entry = byConvo.get(m.conversation_id) ?? { count: 0, last: "" };
    entry.count += 1;
    entry.last = m.content;
    byConvo.set(m.conversation_id, entry);
  }

  return convos.map((c) => ({
    ...c,
    messageCount: byConvo.get(c.id)?.count ?? 0,
    lastMessagePreview: truncate(byConvo.get(c.id)?.last ?? "", 100),
  }));
}

export default function History() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const summaries = await fetchConversationSummaries();
    setConversations(summaries);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchConversationSummaries().then((summaries) => {
      if (!cancelled) setConversations(summaries);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setConfirmingId(null);
    setDeletingId(null);
    setToast("Rozmowa usunięta");
    setTimeout(() => setToast(null), 2000);
    await refresh();
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">📜 Historia rozmów</h1>
          <p className="text-sm text-[var(--text-secondary)]">Wszystkie Twoje rozmowy z agentem</p>
        </div>
      </header>

      {toast && (
        <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-2.5 text-sm text-[var(--success)]">
          ✅ {toast}
        </div>
      )}

      {conversations === null && (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--text-secondary)]">
          ⏳ Wczytywanie historii...
        </div>
      )}

      {conversations !== null && conversations.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Nie masz jeszcze żadnych rozmów. Zacznij nową!
          </p>
          <Link
            href="/chat"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Rozpocznij rozmowę
          </Link>
        </div>
      )}

      {conversations !== null &&
        conversations.length > 0 &&
        conversations.map((c) => (
          <div
            key={c.id}
            className="group relative rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4 transition-colors hover:border-[var(--accent)]"
          >
            <Link href={`/history/${c.id}`} className="block pr-8">
              <p className="font-bold text-[var(--foreground)]">{c.title || "Bez tytułu"}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {formatRelativeDate(c.updated_at)} · {c.messageCount}{" "}
                {c.messageCount === 1 ? "wiadomość" : "wiadomości"}
              </p>
              {c.lastMessagePreview && (
                <p className="mt-2 truncate text-sm italic text-[var(--text-secondary)]">
                  {c.lastMessagePreview}
                </p>
              )}
            </Link>

            {confirmingId === c.id ? (
              <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-sm">
                <span className="text-[var(--text-secondary)]">
                  Czy na pewno chcesz usunąć tę rozmowę? Tej operacji nie można cofnąć.
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="ml-auto shrink-0 rounded-md bg-red-500/90 px-3 py-1 font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-40"
                >
                  {deletingId === c.id ? "Usuwanie..." : "Tak, usuń"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingId(c.id)}
                title="Usuń rozmowę"
                className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
    </div>
  );
}
