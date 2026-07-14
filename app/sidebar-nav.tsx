"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/agent", label: "Agent", highlight: true },
  { href: "/react", label: "ReAct" },
  { href: "/travel", label: "Podróże" },
  { href: "/chat", label: "Chat" },
  { href: "/think", label: "Myślenie" },
  { href: "/fewshot", label: "Słownik" },
  { href: "/format", label: "Formater" },
  { href: "/search", label: "Szukaj" },
  { href: "/generate", label: "Grafiki" },
  { href: "/vision", label: "Vision" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-2.5">
      <span className="mr-2 shrink-0 text-sm font-bold uppercase tracking-[0.12em] text-[var(--foreground)]">
        Marta AI
      </span>

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : item.highlight
                  ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/15"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <span className="ml-auto hidden shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-bg)] px-3 py-1 text-xs text-[var(--text-secondary)] md:flex">
        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
        Gemini API połączone
      </span>
    </nav>
  );
}
