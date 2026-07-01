"use client";

import React from "react";

interface PracticeCalculatorPanelProps {
  className?: string;
}

export default function PracticeCalculatorPanel({ className }: PracticeCalculatorPanelProps) {
  return (
    <div className={`pb-calc-panel ${className ?? ""}`}>
      <div className="pb-calc-panel-header">
        <span className="pb-calc-panel-title">Calculator</span>
        <span className="pb-calc-panel-badge">Graphing</span>
      </div>
      <iframe
        title="Desmos Graphing Calculator"
        src="https://www.desmos.com/calculator"
        className="pb-calc-panel-frame"
      />
    </div>
  );
}
