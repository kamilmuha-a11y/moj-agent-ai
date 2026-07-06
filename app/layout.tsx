import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
