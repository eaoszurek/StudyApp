"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, Info } from "lucide-react";

interface QuestionInfo {
  difficulty: "Easy" | "Medium" | "Hard";
  skillFocus: string;
  subjectLabel: string;
}

interface PracticeBottomBarProps {
  currentIndex: number;
  totalQuestions: number;
  answeredIndices: Set<number>;
  onJumpTo: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  isLastQuestion: boolean;
  nextLabel: string;
  questionInfo: QuestionInfo;
}

export default function PracticeBottomBar({
  currentIndex,
  totalQuestions,
  answeredIndices,
  onJumpTo,
  onPrevious,
  onNext,
  canGoPrevious,
  isLastQuestion,
  nextLabel,
  questionInfo,
}: PracticeBottomBarProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setNavOpen(false);
      }
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setInfoOpen(false);
      }
    };
    if (navOpen || infoOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [navOpen, infoOpen]);

  return (
    <div className="pb-bottom-bar">
      <div className="pb-bottom-bar-left">
        <div className="pb-nav-wrapper" ref={navRef}>
          <button
            type="button"
            className="pb-nav-pill"
            aria-haspopup="true"
            aria-expanded={navOpen}
            aria-label={`Question ${currentIndex + 1} of ${totalQuestions}, ${answeredIndices.size} answered`}
            onClick={() => {
              setNavOpen((prev) => !prev);
              setInfoOpen(false);
            }}
          >
            <span className="pb-nav-pill-label">
              <span className="pb-nav-pill-current">{currentIndex + 1}</span>
              <span className="pb-nav-pill-divider"> / </span>
              <span className="pb-nav-pill-total">{totalQuestions}</span>
            </span>
            {/*
              Progress bar reflects how many questions have been answered (not
              the current index), so skipping ahead doesn't inflate progress.
            */}
            <span
              className="pb-nav-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              aria-valuenow={answeredIndices.size}
            >
              <span
                className="pb-nav-progress-fill"
                style={{
                  width: `${
                    totalQuestions > 0
                      ? Math.max(0, Math.min(100, (answeredIndices.size / totalQuestions) * 100))
                      : 0
                  }%`,
                }}
              />
            </span>
            <ChevronUp size={14} strokeWidth={2} className={`pb-nav-chevron ${navOpen ? "is-open" : ""}`} />
          </button>
          {navOpen && (
            <div className="pb-nav-panel" role="dialog" aria-label="Question navigator">
              <p className="pb-nav-panel-title">Question Navigator</p>
              <div className="pb-nav-grid">
                {Array.from({ length: totalQuestions }, (_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answeredIndices.has(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`pb-nav-cell ${isCurrent ? "is-current" : ""} ${
                        isAnswered ? "is-answered" : ""
                      }`}
                      onClick={() => {
                        onJumpTo(idx);
                        setNavOpen(false);
                      }}
                      aria-label={`Question ${idx + 1}${isAnswered ? " answered" : ""}`}
                    >
                      <span>{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pb-nav-legend">
                <span className="pb-nav-legend-item">
                  <span className="pb-nav-legend-dot is-current" /> Current
                </span>
                <span className="pb-nav-legend-item">
                  <span className="pb-nav-legend-dot is-answered" /> Answered
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pb-info-wrapper" ref={infoRef}>
          <button
            type="button"
            className="pb-info-btn"
            aria-label="Question info"
            aria-haspopup="true"
            aria-expanded={infoOpen}
            onClick={() => {
              setInfoOpen((prev) => !prev);
              setNavOpen(false);
            }}
          >
            <Info size={16} strokeWidth={2} />
          </button>
          {infoOpen && (
            <div className="pb-info-panel" role="dialog" aria-label="Question details">
              <p className="pb-info-panel-title">Question Details</p>
              <dl className="pb-info-list">
                <div className="pb-info-row">
                  <dt>Subject</dt>
                  <dd>{questionInfo.subjectLabel}</dd>
                </div>
                <div className="pb-info-row">
                  <dt>Skill</dt>
                  <dd>{questionInfo.skillFocus}</dd>
                </div>
                <div className="pb-info-row">
                  <dt>Difficulty</dt>
                  <dd>
                    <span
                      className={`pb-info-diff-pill pb-info-diff-${questionInfo.difficulty.toLowerCase()}`}
                    >
                      {questionInfo.difficulty}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="pb-bottom-bar-right">
        <button
          type="button"
          className="pb-btn pb-btn-prev"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          Previous
        </button>
        <button
          type="button"
          className="pb-btn pb-btn-next"
          onClick={onNext}
        >
          {isLastQuestion ? nextLabel : "Next"}
        </button>
      </div>
    </div>
  );
}
