"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, LineChart, Bitcoin, Radar, ClipboardList, TrendingUp } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/crypto", label: "Crypto", icon: Bitcoin, exact: false },
    { href: "/stocks", label: "Stocks", icon: LineChart, exact: false },
    { href: "/options", label: "Options", icon: ClipboardList, exact: false },
    { href: "/scanner", label: "Scanner", icon: Radar, exact: false },
    { href: "/growth", label: "Growth", icon: TrendingUp, exact: false },
    { href: "/settings", label: "Settings", icon: Settings, exact: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border/80 bg-surface-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            Portfolio Command Center
          </h1>
          <p className="text-xs text-slate-500">
            Dashboard v1.0 · SGD
          </p>
        </div>
        <nav className="flex gap-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all sm:flex-none ${
                  active
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "text-slate-400 hover:bg-surface-border/60 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
