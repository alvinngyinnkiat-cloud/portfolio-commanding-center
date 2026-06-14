import type { Metadata } from "next";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { Header } from "@/shared/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Command Center",
  description: "Personal Portfolio Tracker — Dashboard v1.0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-surface text-slate-200 antialiased">
        <PortfolioProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}
