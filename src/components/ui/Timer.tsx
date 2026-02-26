"use client";

import React, { useState, useEffect, useRef } from "react";

interface TimerProps {
  initialMinutes: number;
  onTimeUp: () => void;
  onWarning?: () => void;
  warningMinutes?: number;
  paused?: boolean;
  className?: string;
}

export default function Timer({
  initialMinutes,
  onTimeUp,
  onWarning,
  warningMinutes = 5,
  paused = false,
  className = "",
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60); // Convert to seconds
  const [isWarning, setIsWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTriggered = useRef(false);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onTimeUp();
          return 0;
        }

        // Trigger warning when time reaches warning threshold
        const minutesLeft = Math.floor(prev / 60);
        if (minutesLeft <= warningMinutes && !warningTriggered.current) {
          warningTriggered.current = true;
          setIsWarning(true);
          if (onWarning) {
            onWarning();
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onTimeUp, onWarning, warningMinutes, paused]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (): string => {
    if (timeLeft === 0) return "text-red-600 dark:text-red-400";
    if (isWarning) return "text-amber-600 dark:text-amber-400";
    return "text-slate-700 dark:text-slate-300";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg">⏱️</span>
      <span className={`text-lg font-bold ${getTimeColor()}`}>
        {formatTime(timeLeft)}
      </span>
      {paused && (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Paused
        </span>
      )}
      {isWarning && timeLeft > 0 && null}
    </div>
  );
}

