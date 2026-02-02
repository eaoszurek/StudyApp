"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";

export default function ParallaxMountains() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Different scroll speeds for depth effect
  const layer1Y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const layer2Y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const layer3Y = useTransform(scrollYProgress, [0, 1], ["0%", "70%"]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Background Layer 1 - Far mountains */}
      <motion.div
        style={{ y: layer1Y }}
        className="absolute inset-0 opacity-30"
      >
        <svg
          viewBox="0 0 1440 800"
          className="w-full h-full"
          preserveAspectRatio="xMidYMin slice"
        >
          <defs>
            <linearGradient id="mountain1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E5532" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0,800 L200,500 L400,600 L600,400 L800,550 L1000,350 L1200,450 L1440,300 L1440,800 Z"
            fill="url(#mountain1)"
          />
        </svg>
      </motion.div>

      {/* Background Layer 2 - Middle mountains */}
      <motion.div
        style={{ y: layer2Y }}
        className="absolute inset-0 opacity-40"
      >
        <svg
          viewBox="0 0 1440 800"
          className="w-full h-full"
          preserveAspectRatio="xMidYMin slice"
        >
          <defs>
            <linearGradient id="mountain2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3A3F47" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1E5532" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M0,800 L150,450 L350,550 L550,300 L750,450 L950,250 L1150,350 L1440,200 L1440,800 Z"
            fill="url(#mountain2)"
          />
        </svg>
      </motion.div>

      {/* Background Layer 3 - Foreground mountains */}
      <motion.div
        style={{ y: layer3Y }}
        className="absolute inset-0 opacity-50"
      >
        <svg
          viewBox="0 0 1440 800"
          className="w-full h-full"
          preserveAspectRatio="xMidYMin slice"
        >
          <defs>
            <linearGradient id="mountain3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3A3F47" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d="M0,800 L100,400 L300,500 L500,250 L700,400 L900,200 L1100,300 L1440,150 L1440,800 Z"
            fill="url(#mountain3)"
          />
        </svg>
      </motion.div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0F172A]" />
    </div>
  );
}

