import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "./sidebar-nav";

export const metadata: Metadata = {
  title: "Marta Wiśniewska — Compliance | Hemmersbach",
  description: "Asystent AI ds. compliance, customs, VAT i logistyki projektowej",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex h-dvh flex-col overflow-hidden">
        <SidebarNav />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
