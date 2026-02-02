"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  align?: "left" | "center";
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  align = "left",
}: PageHeaderProps) {
  const isCentered = align === "center";

  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-6 sm:mb-8 md:mb-10 flex flex-col gap-3 sm:gap-4 ${
        isCentered ? "items-center text-center" : ""
      } md:flex-row md:items-end md:justify-between`}
    >
      <div className={`space-y-3 ${isCentered ? "md:text-center" : ""}`}>
        {eyebrow && (
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400 font-semibold">
            {eyebrow}
          </p>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gradient leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3 justify-center md:justify-end">
          {actions}
        </div>
      )}
    </motion.header>
  );
}

