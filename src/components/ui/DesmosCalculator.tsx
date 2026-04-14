"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripHorizontal, X } from "lucide-react";

interface DesmosCalculatorProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function DesmosCalculator({ isOpen, onToggle }: DesmosCalculatorProps) {
  const panelWidth = 560;
  const panelHeight = 520;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const setDefaultPosition = () => {
      const safeX = Math.max(8, window.innerWidth - panelWidth - 16);
      const safeY = Math.max(72, window.innerHeight - panelHeight - 88);
      setPosition({ x: safeX, y: safeY });
    };
    setDefaultPosition();
    window.addEventListener("resize", setDefaultPosition);
    return () => window.removeEventListener("resize", setDefaultPosition);
  }, []);

  const dragBounds = useMemo(() => {
    if (!mounted) return { top: 72, left: 8, right: 8, bottom: 8 };
    return {
      top: 72,
      left: 8,
      right: Math.max(8, window.innerWidth - panelWidth - 8),
      bottom: Math.max(8, window.innerHeight - panelHeight - 8),
    };
  }, [mounted]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={dragBounds}
            onDragEnd={(_, info) => {
              setPosition((prev) => ({
                x: Math.min(dragBounds.right, Math.max(dragBounds.left, prev.x + info.offset.x)),
                y: Math.min(dragBounds.bottom, Math.max(dragBounds.top, prev.y + info.offset.y)),
              }));
            }}
            style={{ x: position.x, y: position.y }}
            className="fixed top-0 left-0 z-[129] w-[560px] h-[520px] max-w-[calc(100vw-16px)] max-h-[calc(100vh-80px)] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-900"
          >
            <div className="h-10 px-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 cursor-move">
              <div className="inline-flex items-center gap-2">
                <GripHorizontal size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-600 dark:text-slate-300">
                  Calculator
                </span>
              </div>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPosition({
                    x: Math.max(8, window.innerWidth - panelWidth - 16),
                    y: Math.max(72, window.innerHeight - panelHeight - 88),
                  })}
                  className="h-7 px-2 inline-flex items-center justify-center rounded-md text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Reset calculator position"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close calculator panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <iframe
              title="Desmos Graphing Calculator"
              src="https://www.desmos.com/calculator"
              className="w-full h-[calc(100%-2.5rem)] bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
