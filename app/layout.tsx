import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Dashboard – Chatbot-Automatisierung",
  description:
    "Leads aus Google Maps, Instagram & LinkedIn qualifizieren, scoren und abarbeiten.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
