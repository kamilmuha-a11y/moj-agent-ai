"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth-context";

type ConversationRow = { id: string; title: string | null; updated_at: string };
type MessageRow = { id: string; role: "user" | "assistant"; content: string; created_at: string };

export default function HistoryDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversation, setConversation] = useState<ConversationRow | null | undefined>(undefined);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .eq("id", params.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!convo) {
        if (!cancelled) {
          setConversation(null);
          setMessages([]);
        }
        return;
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", params.id)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setConversation(convo);
        setMessages(msgs ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, userId]);

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-hidden p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            {conversation === undefined ? "Wczytywanie..." : conversation?.title || "Bez tytułu"}
          </h1>
          {conversation && (
            <p className="text-sm text-[var(--text-secondary)]">
              {new Date(conversation.updated_at).toLocaleString("pl-PL", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/history"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            ← Wróć do listy
          </Link>
          {conversation && (
            <Link
              href={`/chat?conversationId=${conversation.id}`}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              🔄 Kontynuuj rozmowę
            </Link>
          )}
        </div>
      </header>

      {conversation === null && (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--text-secondary)]">
          Nie znaleziono tej rozmowy.
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] whitespace-pre-wrap rounded-lg px-4 py-2.5 ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-[var(--panel-alt)]"
              }`}
            >
              <p className="mb-1 text-xs opacity-70">
                {new Date(m.created_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {m.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
