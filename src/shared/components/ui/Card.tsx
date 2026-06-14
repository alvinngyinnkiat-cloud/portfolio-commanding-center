import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-surface-border/80 bg-surface-card/90 shadow-lg shadow-black/20 backdrop-blur-sm ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex items-start justify-between gap-3 border-b border-surface-border/60 ${
            noPadding ? "px-5 py-4" : "px-5 py-4 sm:px-6"
          }`}
        >
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "p-5 sm:p-6"}>{children}</div>
    </div>
  );
}
