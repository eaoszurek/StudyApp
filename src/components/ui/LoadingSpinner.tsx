"use client";

import Logo from "./Logo";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  message?: string;
  showLogo?: boolean;
}

export default function LoadingSpinner({
  size = "md",
  className = "",
  message,
  showLogo = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {showLogo && (
        <div className="mb-4 opacity-60">
          <Logo href={undefined} size={size === "lg" ? "md" : "sm"} showText={false} />
        </div>
      )}
      <div
        className={`${sizeClasses[size]} border-4 border-slate-300 dark:border-slate-600/30 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin`}
      />
      {message && (
        <p className="text-slate-700 dark:text-slate-300 mt-4 text-sm sm:text-base animate-pulse font-medium text-center max-w-xs">{message}</p>
      )}
    </div>
  );
}

