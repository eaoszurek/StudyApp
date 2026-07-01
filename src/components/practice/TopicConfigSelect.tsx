"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TOPIC_DROPDOWN_HELP } from "@/data/topics";

type TopicConfigSelectProps = {
  topics: string[];
  value: string;
  onChange: (topic: string) => void;
  id?: string;
  placeholder?: string;
};

function TopicOptionLabel({ topic }: { topic: string }) {
  const help = TOPIC_DROPDOWN_HELP[topic];
  return (
    <span className="block w-full text-left text-sm leading-snug">
      <span className="font-semibold text-slate-900 dark:text-slate-100">{topic}</span>
      {help ? (
        <span className="font-normal text-slate-500 dark:text-slate-400"> ({help})</span>
      ) : null}
    </span>
  );
}

function TopicValueDisplay({ topic }: { topic: string }) {
  const help = TOPIC_DROPDOWN_HELP[topic];
  return (
    <span className="block w-full min-w-0 text-left leading-snug">
      <span className="font-semibold text-slate-900 dark:text-slate-100">{topic}</span>
      {help ? (
        <span className="font-normal text-slate-500 dark:text-slate-400"> ({help})</span>
      ) : null}
    </span>
  );
}

export default function TopicConfigSelect({
  topics,
  value,
  onChange,
  id: idProp,
  placeholder = "Choose an SAT subcategory",
}: TopicConfigSelectProps) {
  const reactId = useId();
  const listboxId = idProp ?? `topic-config-select-${reactId}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={listboxId}
        onClick={() => setOpen((o) => !o)}
        className="ai-config-input w-full px-4 py-2.5 rounded-2xl border-2 border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/20 transition-all flex items-start justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${listboxId}-list` : undefined}
      >
        <span className="min-w-0 flex-1 font-medium">
          {value ? (
            <TopicValueDisplay topic={value} />
          ) : (
            <span className="text-slate-500 dark:text-slate-400 font-medium">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 mt-0.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          id={`${listboxId}-list`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg dark:shadow-black/40 py-1"
        >
          <li className="px-1.5 py-0.5" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="relative z-0 w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-500 dark:text-slate-400 font-medium transition-[box-shadow,background-color] duration-150 hover:z-[1] hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-[0_4px_16px_0_rgba(15,23,42,0.1)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.45)]"
            >
              {placeholder}
            </button>
          </li>
          {topics.map((topic) => {
            const selected = value === topic;
            return (
              <li key={topic} className="px-1.5 py-0.5" role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(topic);
                    setOpen(false);
                  }}
                  className={`relative z-0 w-full rounded-xl px-4 py-2.5 text-left transition-[box-shadow,background-color] duration-150 hover:z-[1] hover:shadow-[0_4px_16px_0_rgba(15,23,42,0.1)] dark:hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.45)] ${
                    selected
                      ? "bg-sky-50 dark:bg-sky-900/40 hover:bg-sky-100/90 dark:hover:bg-sky-900/55"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <TopicOptionLabel topic={topic} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
