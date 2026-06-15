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
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="min-h-screen overflow-x-hidden bg-surface text-slate-200 antialiased">
        <Header />
        <PortfolioProvider>
          <main className="mx-auto min-w-0 max-w-full overflow-x-hidden px-4 py-6 sm:max-w-7xl sm:px-6 sm:py-8">
            {children}
          </main>
        </PortfolioProvider>
      </body>
    </html>
  );
}
