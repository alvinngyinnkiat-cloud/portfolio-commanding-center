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
      className={`min-w-0 max-w-full rounded-2xl border border-surface-border/80 bg-surface-card/90 shadow-lg shadow-black/20 backdrop-blur-sm ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex min-w-0 items-start justify-between gap-3 border-b border-surface-border/60 ${
            noPadding ? "px-5 py-4" : "px-5 py-4 sm:px-6"
          }`}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="break-words text-base font-semibold text-slate-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={`min-w-0 ${noPadding ? "" : "p-5 sm:p-6"}`}>{children}</div>
    </div>
  );
}
