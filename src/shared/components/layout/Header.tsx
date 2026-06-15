"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  LineChart,
  Bitcoin,
  Radar,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

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
    <header className="sticky top-0 z-50 overflow-x-hidden border-b border-surface-border/80 bg-surface-card/95 backdrop-blur-md">
      <div className="mx-auto min-w-0 max-w-full px-4 py-4 sm:max-w-7xl sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
            Portfolio Command Center
          </h1>
          <p className="text-xs text-slate-500">Dashboard v1.0 · SGD</p>
        </div>

        <nav
          className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:mt-4 sm:px-0"
          aria-label="Main navigation"
        >
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:px-4 ${
                  active
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "text-slate-400 hover:bg-surface-border/60 hover:text-white"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
