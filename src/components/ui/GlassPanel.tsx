"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  padding?: boolean;
  delay?: number;
  overflow?: "hidden" | "visible";
}

export default function GlassPanel({
  children,
  className,
  as: Tag = "div",
  padding = true,
  delay = 0,
  overflow = "hidden",
}: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "glass-panel relative",
        overflow === "visible" ? "overflow-visible" : "overflow-hidden",
        padding ? "p-4 sm:p-6 md:p-8" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Tag>{children}</Tag>
      {overflow === "hidden" && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/5" />
      )}
    </motion.div>
  );
}

