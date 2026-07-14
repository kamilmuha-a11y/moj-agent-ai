"use client";

import { useState } from "react";

const EXAMPLE_PROMPTS = [
  "Minimalistyczne logo kawiarni w stylu japońskim",
  "Post na Instagram: kawa latte art, ciepłe światło, widok z góry",
  "Kreacja reklamowa: wyprzedaż letnia -50%, nowoczesny design",
  "Ikona aplikacji: robot AI, gradient fioletowo-niebieski, flat design",
  "Infografika: 5 kroków do produktywności, pastelowe kolory",
  "Zdjęcie produktowe: elegancki zegarek na ciemnym tle",
];

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ image: string; text: string } | null>(
    null,
  );
  const [lastPrompt, setLastPrompt] = useState("");

  async function generate(text: string) {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    setLastPrompt(text);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nie udało się wygenerować obrazu.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    generate(prompt);
  }

  function handleDownload() {
    if (!result?.image) return;
    const a = document.createElement("a");
    a.href = result.image;
    a.download = "ai-generated.png";
    a.click();
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-2xl">
            🎨
          </span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Generator grafik AI
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Opisz co chcesz - AI stworzy obraz w kilka sekund
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          Online
        </span>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrompt(p)}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Opisz obraz który chcesz wygenerować..."
          rows={3}
          className="resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-3 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="self-end rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-40"
        >
          🎨 Generuj
        </button>
      </form>

      {isLoading && (
        <div className="flex flex-1 animate-pulse items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-12 text-[var(--text-secondary)]">
          Generuję... (5-15 sekund)
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && !isLoading && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.image}
            alt={lastPrompt}
            className="w-full rounded-xl border border-[var(--border)]"
          />
          {result.text && (
            <p className="text-sm text-[var(--text-secondary)]">{result.text}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
            >
              💾 Pobierz
            </button>
            <button
              type="button"
              onClick={() => generate(lastPrompt)}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-alt)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
            >
              🔄 Ponownie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
