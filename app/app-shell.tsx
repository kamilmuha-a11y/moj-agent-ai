"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <>
      {!isLogin && <SidebarNav />}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </>
  );
}
