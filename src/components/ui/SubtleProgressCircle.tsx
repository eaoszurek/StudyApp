"use client";

import React from "react";

interface SubtleProgressCircleProps {
  progress: number;
  size?: number;
  className?: string;
}

export default function SubtleProgressCircle({
  progress,
  size = 42,
  className = "",
}: SubtleProgressCircleProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));

  return (
    <div
      className={`subtle-progress-circle ${className}`}
      style={
        {
          width: `${size}px`,
          height: `${size}px`,
          ["--progress" as string]: `${clamped}%`,
        } as React.CSSProperties
      }
      aria-label={`Progress ${Math.round(clamped)} percent`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className="subtle-progress-circle__inner">
        <span>{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}

