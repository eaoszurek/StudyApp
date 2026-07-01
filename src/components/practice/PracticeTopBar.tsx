"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronDown, Pause, Play, Calculator } from "lucide-react";

type SectionType = "math" | "reading-writing";

interface PracticeTopBarProps {
  elapsedSeconds: number;
  timerPaused: boolean;
  timerHidden: boolean;
  onTogglePause: () => void;
  onToggleHide: () => void;
  onGoBack: () => void;
  testType: SectionType | null;
  showCalculator?: boolean;
  onToggleCalculator?: () => void;
}

const DIRECTIONS_COPY: Record<SectionType, { title: string; paragraphs: string[] }> = {
  math: {
    title: "Math Section Directions",
    paragraphs: [
      "The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions.",
      "For multiple-choice questions, solve the problem and choose the correct answer from the choices provided. Each answer is worth one point.",
      "You can move between questions freely using the Previous and Next buttons, and you can mark questions for review to come back to them later.",
    ],
  },
  "reading-writing": {
    title: "Reading and Writing Section Directions",
    paragraphs: [
      "The questions in this section address a number of important reading and writing skills.",
      "Read each passage and question carefully, then choose the best answer to the question based on the passage.",
      "All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.",
    ],
  },
};

const formatTime = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function PracticeTopBar({
  elapsedSeconds,
  timerPaused,
  timerHidden,
  onTogglePause,
  onToggleHide,
  onGoBack,
  testType,
  showCalculator,
  onToggleCalculator,
}: PracticeTopBarProps) {
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const directionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!directionsRef.current) return;
      if (directionsRef.current.contains(event.target as Node)) return;
      setDirectionsOpen(false);
    };
    if (directionsOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [directionsOpen]);

  const copy = testType ? DIRECTIONS_COPY[testType] : null;

  return (
    <div className="pb-top-bar">
      <div className="pb-top-bar-left">
        <button type="button" className="pb-go-back" onClick={onGoBack}>
          <ChevronLeft size={16} strokeWidth={2} />
          <span>Go back</span>
        </button>

        <div className="pb-directions-wrapper" ref={directionsRef}>
          <button
            type="button"
            className="pb-directions"
            aria-haspopup="true"
            aria-expanded={directionsOpen}
            onClick={() => setDirectionsOpen((prev) => !prev)}
          >
            <span>Directions</span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`pb-directions-chevron ${directionsOpen ? "is-open" : ""}`}
            />
          </button>
          {directionsOpen && copy && (
            <div className="pb-directions-panel" role="dialog" aria-label={copy.title}>
              <p className="pb-directions-title">{copy.title}</p>
              {copy.paragraphs.map((text, idx) => (
                <p key={idx} className="pb-directions-body">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pb-top-bar-center">
        <span className="pb-timer-value" aria-live="polite">
          {timerHidden ? "—:—" : formatTime(elapsedSeconds)}
        </span>
        <div className="pb-timer-controls">
          <button
            type="button"
            className="pb-timer-pause"
            onClick={onTogglePause}
            aria-label={timerPaused ? "Resume timer" : "Pause timer"}
          >
            {timerPaused ? <Play size={12} strokeWidth={2.5} /> : <Pause size={12} strokeWidth={2.5} />}
          </button>
          <button type="button" className="pb-timer-hide" onClick={onToggleHide}>
            {timerHidden ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      <div className="pb-top-bar-right">
        {testType === "math" && onToggleCalculator && (
          <button
            type="button"
            className={`pb-calc-btn ${showCalculator ? "is-active" : ""}`}
            onClick={onToggleCalculator}
            aria-pressed={showCalculator}
            aria-label={showCalculator ? "Close calculator" : "Open calculator"}
          >
            <Calculator size={18} strokeWidth={1.75} />
            <span>Calculator</span>
          </button>
        )}
      </div>
    </div>
  );
}
