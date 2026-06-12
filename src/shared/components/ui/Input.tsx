import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <input
        className={`rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-accent-red">{error}</span>}
    </div>
  );
}
