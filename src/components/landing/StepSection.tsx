"use client";

import { motion } from "framer-motion";
import FeatureIcon from "@/components/ui/FeatureIcon";
import type { FeatureIconName } from "@/components/ui/FeatureIcon";
import RouteMapMockup from "./mockups/RouteMapMockup";
import QuizMockup from "./mockups/QuizMockup";
import AssessmentMockup from "./mockups/AssessmentMockup";

const steps = [
  {
    number: "01",
    title: "Take a quick checkpoint",
    description: "Get a fast baseline and see exactly where you are losing points.",
    icon: "dashboard" as FeatureIconName,
    mockup: <AssessmentMockup />,
    color: "from-sky-500/20 to-green-500/20",
    highlights: ["Fast baseline", "Weak-skill diagnosis", "Quick start"],
    accentColor: "sky",
  },
  {
    number: "02",
    title: "Get your personal climb plan",
    description: "Daily tasks adapt to your weak skills, timeline, and target score.",
    icon: "study-plan" as FeatureIconName,
    mockup: <QuizMockup />,
    color: "from-green-500/20 to-blue-500/20",
    highlights: ["15-minute daily plan", "Adaptive tasks", "Focused weak-skill practice"],
    accentColor: "green",
  },
  {
    number: "03",
    title: "Improve faster with instant help",
    description: "Use Trail Buddy for clear explanations and step-by-step guidance right when you need it.",
    icon: "practice" as FeatureIconName,
    mockup: <RouteMapMockup />,
    color: "from-blue-500/20 to-purple-500/20",
    highlights: ["Question review grid", "Step-by-step AI help", "Clear next action"],
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
            How Peak Prep works
          </h2>
          <p className="text-base text-slate-700 leading-relaxed font-medium">
            A fast 3-step loop built to raise your score without wasting time.
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
                <div className="relative group max-w-4xl mx-auto">
                  {/* Subtle Glow behind the card */}
                  <div className={`absolute -inset-4 bg-gradient-to-r ${step.color} rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10`} />
                  
                  <div className="relative bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-[2rem] p-8 md:p-10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] overflow-visible">
                    
                    <div className={`flex flex-col ${
                      idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    } gap-12 lg:gap-16 items-center relative z-10`}>
                      {/* Content */}
                      <div className="flex-1 space-y-6">
                        {/* Step Header */}
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 shadow-sm">
                            <FeatureIcon name={step.icon} size={28} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-3xl font-black text-slate-200 leading-none">
                              {step.number}
                            </span>
                            <div className={`h-1.5 w-8 mt-1.5 ${
                              step.accentColor === "sky" ? "bg-sky-500" :
                              step.accentColor === "green" ? "bg-green-500" :
                              "bg-blue-500"
                            } rounded-full`} />
                          </div>
                        </div>
                        
                        <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                          {step.title}
                        </h3>
                        
                        <p className="text-base md:text-lg text-slate-600 leading-relaxed font-medium">
                          {step.description}
                        </p>

                        {/* Feature Highlights */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {step.highlights.map((highlight, highlightIdx) => (
                            <motion.div
                              key={highlightIdx}
                              initial={{ opacity: 0, scale: 0.9 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.4, delay: idx * 0.1 + highlightIdx * 0.05 }}
                              className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold shadow-sm"
                            >
                              {highlight}
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Mockup Visual */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 relative w-full group/mockup"
                      >
                        <div className="relative">
                          {/* Inner Glow around mockup */}
                          <div className={`absolute -inset-10 bg-gradient-to-tr ${step.color} rounded-full blur-[60px] opacity-40 group-hover/mockup:opacity-60 transition-opacity duration-1000 -z-10`} />
                          
                          <div className="relative bg-white p-2 sm:p-3 rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] border border-slate-100/80">
                            <div className="w-full relative overflow-hidden rounded-xl bg-slate-50">
                              {/* Mockup */}
                              <div className="relative z-10 transition-transform duration-700 group-hover/mockup:scale-105">
                                {step.mockup}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>

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

