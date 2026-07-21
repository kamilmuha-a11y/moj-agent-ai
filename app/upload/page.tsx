"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth-context";

type DocumentSummary = {
  title: string;
  chunkCount: number;
  createdAt: string;
};

type SearchResult = {
  title: string;
  content: string;
  similarity: number;
};

async function fetchDocumentSummaries(userId: string): Promise<DocumentSummary[]> {
  const { data } = await supabase
    .from("documents")
    .select("title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!data) return [];

  const byTitle = new Map<string, { count: number; createdAt: string }>();
  for (const row of data) {
    const title = row.title ?? "Bez tytułu";
    const entry = byTitle.get(title) ?? { count: 0, createdAt: row.created_at };
    entry.count += 1;
    byTitle.set(title, entry);
  }

  return Array.from(byTitle.entries()).map(([title, { count, createdAt }]) => ({
    title,
    chunkCount: count,
    createdAt,
  }));
}

export default function Upload() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [confirmingTitle, setConfirmingTitle] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<SearchResult[] | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState("");

  const refreshDocuments = useCallback(async () => {
    if (!userId) return;
    const summaries = await fetchDocumentSummaries(userId);
    setDocuments(summaries);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchDocumentSummaries(userId).then((summaries) => {
      if (!cancelled) setDocuments(summaries);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isSaving || !userId) return;

    setIsSaving(true);
    setError("");
    setSuccess("");
    setProgress(null);

    try {
      const res = await fetch("/api/upload-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, userId }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Nie udało się zapisać dokumentu.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "progress") {
            setProgress({ current: event.current, total: event.total });
          } else if (event.type === "done") {
            setSuccess(`✅ Zapisano ${event.chunks_saved} fragmentów!`);
            setTitle("");
            setContent("");
            await refreshDocuments();
          } else if (event.type === "error") {
            setError(event.error);
          }
        }
      }
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setIsSaving(false);
      setProgress(null);
    }
  }

  async function handleDelete(docTitle: string) {
    if (!userId) return;
    setDeletingTitle(docTitle);
    await supabase.from("documents").delete().eq("title", docTitle).eq("user_id", userId);
    setConfirmingTitle(null);
    setDeletingTitle(null);
    await refreshDocuments();
  }

  async function handleTestSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!testQuery.trim() || testLoading || !userId) return;

    setTestLoading(true);
    setTestError("");
    setTestResults(null);

    try {
      const embedRes = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testQuery }),
      });
      const embedData = await embedRes.json();
      if (!embedRes.ok || !embedData.embedding) {
        setTestError(embedData.error || "Nie udało się przetworzyć zapytania.");
        return;
      }

      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: embedData.embedding,
        match_threshold: 0.3,
        match_count: 5,
        p_user_id: userId,
      });

      if (error) {
        setTestError("Błąd wyszukiwania w bazie wiedzy.");
        return;
      }

      setTestResults(data ?? []);
    } catch {
      setTestError("Nie udało się połączyć z serwerem.");
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-2xl">
            📚
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Baza wiedzy</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Wklej tekst — agent będzie z niego korzystał
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Np. Cennik 2026, FAQ, Regulamin firmy"
          className="rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Wklej tutaj treść dokumentu..."
          className="min-h-[300px] resize-y rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={isSaving || !title.trim() || !content.trim()}
          className="self-end rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
        >
          📤 Zapisz w bazie wiedzy
        </button>
      </form>

      {isSaving && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {progress
              ? `Przetwarzam fragment ${progress.current} z ${progress.total}...`
              : "Dzielę dokument na fragmenty..."}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel-alt)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{
                width: progress ? `${(progress.current / progress.total) * 100}%` : "5%",
              }}
            />
          </div>
        </div>
      )}

      {error && !isSaving && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && !isSaving && (
        <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-2.5 text-sm text-[var(--success)]">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Testuj wyszukiwanie</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Sprawdź, co agent znajdzie w bazie wiedzy — bez pytania go samego.
        </p>
        <form onSubmit={handleTestSearch} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Szukaj w bazie wiedzy..."
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2.5 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={testLoading || !testQuery.trim()}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
          >
            {testLoading ? "Szukam..." : "🔍 Szukaj"}
          </button>
        </form>

        {testError && <p className="text-sm text-red-400">{testError}</p>}

        {testResults !== null && testResults.length === 0 && !testError && (
          <p className="text-sm text-[var(--text-secondary)]">
            Brak pasujących fragmentów w bazie wiedzy.
          </p>
        )}

        {testResults !== null && testResults.length > 0 && (
          <div className="flex flex-col gap-2">
            {testResults.map((r, i) => (
              <div
                key={i}
                className="rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-3"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--foreground)]">{r.title}</span>
                  <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                    similarity {r.similarity.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Zapisane dokumenty</h2>
          {documents !== null && documents.length > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              {documents.reduce((sum, d) => sum + d.chunkCount, 0)} fragmentów z {documents.length}{" "}
              {documents.length === 1 ? "dokumentu" : "dokumentów"}
            </span>
          )}
        </div>

        {documents === null && (
          <p className="text-sm text-[var(--text-secondary)]">⏳ Wczytywanie...</p>
        )}

        {documents !== null && documents.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            Brak dokumentów. Wklej pierwszy tekst powyżej.
          </p>
        )}

        {documents !== null &&
          documents.map((doc) => (
            <div
              key={doc.title}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">{doc.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {doc.chunkCount} {doc.chunkCount === 1 ? "fragment" : "fragmentów"} ·{" "}
                  {new Date(doc.createdAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {confirmingTitle === doc.title ? (
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.title)}
                    disabled={deletingTitle === doc.title}
                    className="rounded-md bg-red-500/90 px-3 py-1 font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-40"
                  >
                    {deletingTitle === doc.title ? "Usuwanie..." : "Tak, usuń"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingTitle(null)}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
                  >
                    Anuluj
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingTitle(doc.title)}
                  title="Usuń dokument"
                  className="shrink-0 rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:text-red-400"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
