import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <input
        className={`rounded-xl border border-surface-border bg-surface/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ${className}`}
        {...props}
      />
      {hint && !error && (
        <span className="text-xs text-slate-500">{hint}</span>
      )}
      {error && <span className="text-xs text-accent-red">{error}</span>}
    </div>
  );
}
