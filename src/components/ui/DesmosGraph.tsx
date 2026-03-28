"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        element: HTMLElement,
        options?: Record<string, unknown>
      ) => {
        setExpression: (expression: { id?: string; latex: string }) => void;
        destroy: () => void;
      };
    };
  }
}

interface DesmosGraphProps {
  expressions: string[];
}

const DESMOS_API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
const DESMOS_SCRIPT_BASE = "https://www.desmos.com/api/v1.9/calculator.js";

interface Point {
  x: number;
  y: number;
}

const PLOT_WIDTH = 720;
const PLOT_HEIGHT = 280;
const PLOT_PADDING = 28;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normalizeExpression(rawExpression: string): { mode: "function"; jsExpression: string } | { mode: "vertical"; x: number } | null {
  const compact = String(rawExpression || "").trim();
  if (!compact) return null;
  const cleaned = compact.replace(/\s+/g, "");

  let rhs = cleaned;
  if (cleaned.includes("=")) {
    const [left, right] = cleaned.split("=", 2);
    const leftLower = left.toLowerCase();
    const rightLower = right.toLowerCase();
    if (leftLower === "y") {
      rhs = right;
    } else if (rightLower === "y") {
      rhs = left;
    } else if (leftLower === "x") {
      const constant = Number(right);
      if (Number.isFinite(constant)) return { mode: "vertical", x: constant };
      return null;
    } else {
      rhs = right;
    }
  }

  if (!/^[0-9a-zA-Z+\-*/^().,_\s]+$/.test(rhs)) return null;

  const withMultiplication = rhs
    .replace(/(\d)(x)/gi, "$1*$2")
    .replace(/(x)(\d)/gi, "$1*$2")
    .replace(/(\))(x|\d)/gi, "$1*$2")
    .replace(/(x|\d)\(/gi, "$1*(");

  const mappedFunctions = withMultiplication
    .replace(/\bln\(/gi, "Math.log(")
    .replace(/\blog\(/gi, "Math.log10(")
    .replace(/\bsqrt\(/gi, "Math.sqrt(")
    .replace(/\babs\(/gi, "Math.abs(")
    .replace(/\bsin\(/gi, "Math.sin(")
    .replace(/\bcos\(/gi, "Math.cos(")
    .replace(/\btan\(/gi, "Math.tan(")
    .replace(/\bexp\(/gi, "Math.exp(")
    .replace(/\bfloor\(/gi, "Math.floor(")
    .replace(/\bceil\(/gi, "Math.ceil(")
    .replace(/\bround\(/gi, "Math.round(")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/g, "Math.E")
    .replace(/\^/g, "**");

  if (!/^[0-9x+\-*/().,_\sA-Za-z]+$/.test(mappedFunctions)) return null;
  if (/\b(window|document|globalThis|Function|eval|constructor)\b/.test(mappedFunctions)) return null;
  return { mode: "function", jsExpression: mappedFunctions };
}

function sampleExpression(rawExpression: string): Point[] {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) return [];
  if (normalized.mode === "vertical") {
    return [
      { x: normalized.x, y: -10 },
      { x: normalized.x, y: 10 },
    ];
  }

  let evaluator: ((x: number) => number) | null = null;
  try {
    evaluator = new Function("x", `return ${normalized.jsExpression};`) as (x: number) => number;
  } catch {
    return [];
  }

  const points: Point[] = [];
  for (let x = -10; x <= 10; x += 0.25) {
    try {
      const y = evaluator(x);
      if (!Number.isFinite(y)) continue;
      if (Math.abs(y) > 1e4) continue;
      points.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
    } catch {
      // Ignore isolated evaluation failures and keep sampling.
    }
  }
  return points;
}

function ExpressionFallbackGraph({ expression }: { expression: string }) {
  const points = sampleExpression(expression);
  if (points.length < 2) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const xRange = maxX - minX;
  const yRange = maxY - minY;
  const padX = xRange * 0.08;
  const padY = yRange * 0.1;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const toSvgX = (x: number) =>
    PLOT_PADDING + ((x - minX) / (maxX - minX)) * (PLOT_WIDTH - PLOT_PADDING * 2);
  const toSvgY = (y: number) =>
    PLOT_HEIGHT - PLOT_PADDING - ((y - minY) / (maxY - minY)) * (PLOT_HEIGHT - PLOT_PADDING * 2);

  const axisX = clamp(toSvgX(0), PLOT_PADDING, PLOT_WIDTH - PLOT_PADDING);
  const axisY = clamp(toSvgY(0), PLOT_PADDING, PLOT_HEIGHT - PLOT_PADDING);
  const pathData = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${toSvgX(point.x).toFixed(2)} ${toSvgY(point.y).toFixed(2)}`)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 p-2">
        <svg viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`} className="w-full h-[220px] sm:h-[250px]" role="img" aria-label={`Graph of ${expression}`}>
          <rect x="0" y="0" width={PLOT_WIDTH} height={PLOT_HEIGHT} fill="transparent" />
          <line x1={PLOT_PADDING} y1={axisY} x2={PLOT_WIDTH - PLOT_PADDING} y2={axisY} stroke="#94a3b8" strokeWidth="1.2" />
          <line x1={axisX} y1={PLOT_PADDING} x2={axisX} y2={PLOT_HEIGHT - PLOT_PADDING} stroke="#94a3b8" strokeWidth="1.2" />
          <path d={pathData} fill="none" stroke="#0ea5e9" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Expression: {expression}
      </p>
    </div>
  );
}

export default function DesmosGraph({ expressions }: DesmosGraphProps) {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const calculatorRef = useRef<{ destroy: () => void; setExpression: (expression: { id?: string; latex: string }) => void } | null>(null);
  const [renderMode, setRenderMode] = useState<"desmos" | "fallback">("fallback");

  useEffect(() => {
    if (!expressions.length || !graphRef.current) return;
    if (!DESMOS_API_KEY) {
      setRenderMode("fallback");
      return;
    }

    const initializeCalculator = () => {
      if (!window.Desmos || !graphRef.current) return;
      calculatorRef.current?.destroy();
      const calculator = window.Desmos.GraphingCalculator(graphRef.current, {
        expressions: true,
        settingsMenu: false,
        keypad: false,
        zoomButtons: true,
        lockViewport: false,
      });
      expressions.forEach((expression, index) => {
        calculator.setExpression({ id: `eq-${index}`, latex: expression });
      });
      calculatorRef.current = calculator;
      setRenderMode("desmos");
    };

    const scriptSrc = `${DESMOS_SCRIPT_BASE}?apiKey=${encodeURIComponent(DESMOS_API_KEY)}`;
    const existingScript = document.querySelector('script[data-desmos-script="true"]') as HTMLScriptElement | null;
    if (window.Desmos) {
      initializeCalculator();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", initializeCalculator);
      existingScript.addEventListener("error", () => setRenderMode("fallback"));
      return () => {
        existingScript.removeEventListener("load", initializeCalculator);
        existingScript.removeEventListener("error", () => setRenderMode("fallback"));
      };
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.setAttribute("data-desmos-script", "true");
    script.async = true;
    script.onload = initializeCalculator;
    script.onerror = () => setRenderMode("fallback");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      calculatorRef.current?.destroy();
    };
  }, [expressions]);

  if (!expressions.length) return null;

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4">
      {renderMode === "desmos" ? (
        <div ref={graphRef} className="w-full h-[260px] sm:h-[300px]" />
      ) : (
        <ExpressionFallbackGraph expression={expressions[0]} />
      )}
    </div>
  );
}
