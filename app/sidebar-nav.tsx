"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/agent", label: "Agent", icon: "🤖", highlight: true },
  { href: "/react", label: "ReAct", icon: "🔄" },
  { href: "/travel", label: "Podróże", icon: "✈️" },
  { href: "/chat", label: "Chat", icon: "💬" },
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
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-3 py-2">
      <span className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-base">
        📦
      </span>

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : item.highlight
                  ? "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/15"
                  : "text-[var(--text-secondary)] hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
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
