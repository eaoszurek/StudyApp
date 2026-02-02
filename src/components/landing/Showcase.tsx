"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import AppMockup from "./mockups/AppMockup";

export default function Showcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Parallax transforms
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, 5]);

  return (
    <section
      ref={containerRef}
      className="relative px-6 md:px-12 lg:px-16 section-spacing overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-slate-600 mb-3 font-semibold">
            See It In Action
          </p>
          <h2 className="text-display text-gradient-hero mb-4">
            Your complete SAT expedition platform
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed font-medium">
            Everything you need in one beautifully designed interface
          </p>
        </motion.div>

        {/* Main Showcase */}
        <div className="relative">
          {/* Main Mockup Container */}
          <motion.div
            style={{ y: y1, rotateY }}
            className="relative z-10 premium-card pricing-card-no-hover p-6 md:p-8 lg:p-10"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
            }}
          >
            {/* Large App Mockup */}
            <div className="w-full max-w-5xl mx-auto mb-4">
              <AppMockup />
            </div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {[
            { label: "Students Climbing", value: "12,000+" },
            { label: "Average Score Lift", value: "+210 pts" },
            { label: "Peaks Reached", value: "8,500+" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient-hero mb-1">
                {stat.value}
              </div>
              <div className="text-slate-600 text-xs uppercase tracking-wider font-semibold">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

