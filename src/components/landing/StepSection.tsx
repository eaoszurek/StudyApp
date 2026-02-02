"use client";

import { motion } from "framer-motion";
import RouteMapMockup from "./mockups/RouteMapMockup";
import QuizMockup from "./mockups/QuizMockup";
import AssessmentMockup from "./mockups/AssessmentMockup";

const steps = [
  {
    number: "01",
    title: "Set your goal",
    description: "Tell Peak Prep what you’re working on so your next step is always clear.",
    icon: "⛺",
    mockup: <AssessmentMockup />,
    color: "from-sky-500/20 to-green-500/20",
    highlights: ["2-minute setup", "Clear target score", "Stress-free start"],
    accentColor: "sky",
  },
  {
    number: "02",
    title: "Study smart",
    description: "Get focused practice, flashcards, and explanations built for short sessions.",
    icon: "🗺️",
    mockup: <RouteMapMockup />,
    color: "from-green-500/20 to-blue-500/20",
    highlights: ["Short daily sessions", "Skill-focused practice", "Coach-like explanations"],
    accentColor: "green",
  },
  {
    number: "03",
    title: "See progress",
    description: "Track your climb and keep momentum with quick wins and clear feedback.",
    icon: "🚩",
    mockup: <QuizMockup />,
    color: "from-blue-500/20 to-purple-500/20",
    highlights: ["Progress snapshots", "Confidence boosts", "Next-step guidance"],
    accentColor: "blue",
  },
];

export default function StepSection() {
  return (
    <section id="how-it-works" className="relative px-6 md:px-12 lg:px-16 section-spacing overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-slate-600 mb-3 font-semibold">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            SAT prep that doesn’t overwhelm you
          </h2>
          <p className="text-base text-slate-700 leading-relaxed font-medium">
            A clear, daily path forward built for 10–30 minute study bursts
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-24 md:space-y-32">
          {steps.map((step, idx) => {
            const accentColors = {
              sky: "border-slate-300 bg-slate-50",
              green: "border-slate-300 bg-slate-50",
              blue: "border-slate-300 bg-slate-50",
            };
            const highlightColors = {
              sky: "bg-white border-slate-300 text-slate-900",
              green: "bg-white border-slate-300 text-slate-900",
              blue: "bg-white border-slate-300 text-slate-900",
            };
            const accentClass = accentColors[step.accentColor as keyof typeof accentColors];
            const highlightClass = highlightColors[step.accentColor as keyof typeof highlightColors];

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                className="relative"
              >
                {/* Main Container Card */}
                <div className={`relative premium-card pricing-card-no-hover p-8 md:p-10 border-2 ${accentClass} overflow-visible max-w-4xl mx-auto`}>
                  
                  <div className={`flex flex-col ${
                    idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-10 lg:gap-12 items-center relative z-10`}>
                    {/* Content */}
                    <div className="flex-1 space-y-5">
                      {/* Step Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-4xl">{step.icon}</div>
                        <div className="flex flex-col">
                          <div className="text-3xl font-bold text-slate-600">
                            {step.number}
                          </div>
                          <div className={`h-1 w-10 mt-1 ${
                            step.accentColor === "sky" ? "bg-sky-500" :
                            step.accentColor === "green" ? "bg-green-500" :
                            "bg-blue-500"
                          } rounded-full`} />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
                        {step.title}
                      </h3>
                      
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-md">
                        {step.description}
                      </p>

                      {/* Feature Highlights */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {step.highlights.map((highlight, highlightIdx) => (
                          <motion.div
                            key={highlightIdx}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.2 + highlightIdx * 0.1 }}
                            className={`px-3 py-1.5 rounded border ${highlightClass} backdrop-blur-sm text-xs font-medium`}
                          >
                            {highlight}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Mockup Visual */}
                    <motion.div
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.15 }}
                      className="flex-1 relative w-full max-w-sm"
                    >
                      {/* Floating Card Effect */}
                      <div className="relative">
                        {/* Card with Clear Border */}
                        <div className={`relative premium-card pricing-card-no-hover p-3 border-2 ${
                          step.accentColor === "sky" ? "border-sky-500/40" :
                          step.accentColor === "green" ? "border-green-500/40" :
                          "border-blue-500/40"
                        } shadow-2xl`}>
                          <div className="w-full h-full min-h-[200px] relative">
                            {/* Mockup */}
                            <div className="relative z-10 scale-90">
                              {step.mockup}
                            </div>
                            
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

