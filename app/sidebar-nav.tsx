"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/agent", label: "Agent", icon: "🤖", highlight: true },
  { href: "/react", label: "ReAct", icon: "🔄" },
  { href: "/", label: "Chat", icon: "💬" },
  { href: "/think", label: "Myślenie", icon: "🧠" },
  { href: "/fewshot", label: "Słownik", icon: "📚" },
  { href: "/format", label: "Formater", icon: "📐" },
  { href: "/search", label: "Szukaj", icon: "🌐" },
  { href: "/generate", label: "Grafiki", icon: "🎨" },
  { href: "/vision", label: "Vision", icon: "👁️" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-6 sm:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-xl">
            📦
          </span>
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              Marta AI
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Compliance Suite
            </div>
          </div>
        </div>

        <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Workspace
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, i) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  i === 0 ? "mb-2 border border-[var(--success)]/30" : ""
                } ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : item.highlight
                      ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/15"
                      : "text-[var(--text-secondary)] hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--success)]" />
          Gemini API połączone
        </div>
      </aside>

      <nav className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-3 py-2 sm:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-base">
          📦
        </span>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : item.highlight
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
