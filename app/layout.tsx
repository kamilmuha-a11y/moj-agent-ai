import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./app-shell";
import { AuthProvider } from "./auth-context";

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
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
