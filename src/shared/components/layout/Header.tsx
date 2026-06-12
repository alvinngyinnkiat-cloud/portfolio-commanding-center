"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="border-b border-surface-border bg-surface-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-bold text-white">
            Portfolio Command Center
          </h1>
          <p className="text-xs text-slate-500">Dashboard v1.0 · SGD · localStorage</p>
        </div>
        <nav className="flex gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/20 text-accent"
                    : "text-slate-400 hover:bg-surface-border hover:text-white"
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
