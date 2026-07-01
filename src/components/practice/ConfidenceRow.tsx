"use client";

import React from "react";

export type Confidence = "got_it" | "unsure" | "no_idea";

interface ConfidenceRowProps {
  value?: Confidence;
  onChange: (next: Confidence) => void;
}

const OPTIONS: Array<{ id: Confidence; label: string }> = [
  { id: "got_it", label: "Got it" },
  { id: "unsure", label: "Unsure" },
  { id: "no_idea", label: "No idea" },
];

/**
 * Optional, non-blocking confidence prompt rendered above the answer choices
 * during a practice question. Used post-test for "trust your gut" analytics.
 * Selecting one is non-blocking — it never gates Next.
 */
export default function ConfidenceRow({ value, onChange }: ConfidenceRowProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
        Confidence
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Confidence on this question">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={isSelected}
              className={`px-3 py-1 rounded-full border transition-colors font-semibold ${
                isSelected
                  ? "border-sky-400 bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100 dark:border-sky-500"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
