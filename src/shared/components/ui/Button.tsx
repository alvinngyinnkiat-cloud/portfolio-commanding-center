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
    primary: "bg-accent text-white hover:bg-blue-600",
    secondary: "bg-surface-border text-slate-200 hover:bg-slate-600",
    danger: "bg-accent-red/20 text-accent-red hover:bg-accent-red/30",
    ghost: "text-slate-400 hover:text-white hover:bg-surface-border",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      className={`rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
