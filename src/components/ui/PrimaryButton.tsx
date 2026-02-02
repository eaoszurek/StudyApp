"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

export default function PrimaryButton({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const base =
    "btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out";
  const variants: Record<typeof variant, string> = {
    primary: "btn-primary focus-visible:outline-sky-200 dark:focus-visible:outline-sky-600 active:scale-[0.98]",
    secondary: "btn-secondary focus-visible:outline-slate-200/40 dark:focus-visible:outline-slate-600/40 active:scale-[0.98]",
    ghost:
      "text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-slate-300 dark:focus-visible:outline-slate-600 active:scale-[0.98]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full justify-center" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

