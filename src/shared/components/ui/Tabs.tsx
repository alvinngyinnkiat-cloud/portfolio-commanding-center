"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  description?: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
}

export function Tabs({ items, defaultTab }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTab ?? items[0]?.id ?? "");
  const active = items.find((t) => t.id === activeId) ?? items[0];

  return (
    <div className="min-w-0 space-y-4">
      <div
        className="-mx-1 flex min-w-0 gap-1 overflow-x-auto pb-1 scrollbar-thin sm:mx-0"
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "bg-surface-card text-slate-400 hover:bg-surface-border hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div key={active.id} role="tabpanel" className="min-w-0">
          {active.content}
        </div>
      )}
    </div>
  );
}
