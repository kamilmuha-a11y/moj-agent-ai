import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
      <body className="flex h-dvh flex-col">
        <nav className="mx-auto flex w-full max-w-[800px] shrink-0 gap-4 px-4 pt-3 text-sm text-[#888]">
          <Link href="/" className="hover:text-[#ededed]">
            🤖 Chat
          </Link>
          <Link href="/think" className="hover:text-[#ededed]">
            🧠 Myślenie
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
