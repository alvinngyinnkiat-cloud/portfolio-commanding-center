import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-accent text-white shadow-md shadow-accent/25 hover:bg-blue-500 active:scale-[0.98]",
    secondary:
      "bg-surface-border/80 text-slate-200 hover:bg-slate-600 active:scale-[0.98]",
    danger:
      "bg-accent-red/15 text-accent-red hover:bg-accent-red/25 active:scale-[0.98]",
    ghost: "text-slate-400 hover:bg-surface-border hover:text-white",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
  };

  return (
    <button
      className={`font-medium transition-all disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
