import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, subtitle, children, className = "", action }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
