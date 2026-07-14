"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type WeatherData =
  | {
      city: string;
      country: string;
      temperature: number;
      description: string;
      wind: number;
      humidity: number;
    }
  | { error: string };

type RateData = { code: string; rate: number; date: string } | { code: string; error: string };

type Holiday = { date: string; name: string };

type DashboardData = {
  weather: WeatherData;
  rates: RateData[];
  holidays: Holiday[] | { error: string };
  now: string;
  fetchedAt: number;
};

const QUICK_ACTIONS = [
  { href: "/travel", label: "Zaplanuj podróż", emoji: "🌍" },
  { href: "/react?prompt=" + encodeURIComponent("Porównaj kursy EUR, USD, GBP, CHF"), label: "Porównaj waluty", emoji: "📊" },
  { href: "/react", label: "Agent ReAct", emoji: "🔄" },
  { href: "/chat", label: "Chat z agentem", emoji: "💬" },
  { href: "/think", label: "Tryb myślenia", emoji: "🧠" },
  { href: "/fewshot", label: "Słownik AI", emoji: "📖" },
];

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "🌙 Dobry wieczór";
  if (hour < 12) return "🌅 Dzień dobry";
  if (hour < 18) return "☀️ Dzień dobry";
  return "🌙 Dobry wieczór";
}

function formatUpdatedAt(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-5 ${className}`}>
      <div className="skeleton mb-3 h-4 w-24 rounded bg-[var(--panel-alt)]" />
      <div className="skeleton mb-2 h-8 w-32 rounded bg-[var(--panel-alt)]" />
      <div className="skeleton h-4 w-40 rounded bg-[var(--panel-alt)]" />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard-data");
      const json: DashboardData = await res.json();
      setData(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard-data")
      .then((res) => res.json())
      .then((json: DashboardData) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatedLabel = formatUpdatedAt(data?.fetchedAt ?? null);

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-5xl flex-1 flex-col gap-5 overflow-y-auto p-6">
      <header className="card-fade-in flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            {greeting()}!
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {data?.now ?? "Ładowanie daty..."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          title="Odśwież dane"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--panel-alt)] text-lg text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-40"
        >
          <span className={refreshing ? "animate-spin" : ""}>🔄</span>
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Weather card */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card-fade-in rounded-lg border border-[var(--border)] border-l-2 border-l-cyan-400 bg-[var(--panel-bg)] p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              🌤️ Pogoda
            </p>
            {(() => {
              const weather = data?.weather;
              if (!weather) return null;
              if ("error" in weather) {
                return <p className="text-sm text-red-400">{weather.error}</p>;
              }
              return (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {weather.city}, {weather.country}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">
                    {Math.round(weather.temperature)}°C
                  </p>
                  <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">
                    {weather.description}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    💨 {weather.wind} km/h · 💧 {weather.humidity}%
                  </p>
                </>
              );
            })()}
            {updatedLabel && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Ostatnia aktualizacja: {updatedLabel}
              </p>
            )}
          </div>
        )}

        {/* Currency card */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card-fade-in rounded-lg border border-[var(--border)] border-l-2 border-l-emerald-400 bg-[var(--panel-bg)] p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              💶 Kursy walut
            </p>
            <div className="flex flex-col gap-1.5">
              {data?.rates.map((r) =>
                "error" in r ? (
                  <p key={r.code} className="text-sm text-red-400">
                    {r.code}: {r.error}
                  </p>
                ) : (
                  <p key={r.code} className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">{r.code}:</span> {r.rate.toFixed(4)} PLN
                  </p>
                ),
              )}
            </div>
            {data?.rates.some((r) => !("error" in r)) && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Kurs z:{" "}
                {(() => {
                  const first = data.rates.find((r) => !("error" in r)) as
                    | { code: string; rate: number; date: string }
                    | undefined;
                  return first?.date;
                })()}
              </p>
            )}
            {updatedLabel && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Ostatnia aktualizacja: {updatedLabel}
              </p>
            )}
          </div>
        )}

        {/* Holidays card */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card-fade-in rounded-lg border border-[var(--border)] border-l-2 border-l-amber-400 bg-[var(--panel-bg)] p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              📅 Nadchodzące święta
            </p>
            {(() => {
              const holidays = data?.holidays;
              if (!holidays) return null;
              if (!Array.isArray(holidays)) {
                return <p className="text-sm text-red-400">{holidays.error}</p>;
              }
              if (holidays.length === 0) {
                return (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Brak nadchodzących świąt w tym roku.
                  </p>
                );
              }
              return (
                <div className="flex flex-col gap-1.5">
                  {holidays.map((h) => (
                    <p key={h.date} className="text-sm text-[var(--foreground)]">
                      {new Date(h.date + "T00:00:00").toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      — {h.name}
                    </p>
                  ))}
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Następne za: {daysUntil(holidays[0].date)} dni
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick actions card */}
        <div className="card-fade-in rounded-lg border border-[var(--border)] border-l-2 border-l-fuchsia-400 bg-[var(--panel-bg)] p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
            🤖 Szybkie akcje
          </p>
          <div className="flex flex-col gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
              >
                {action.emoji} {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
