"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState, useEffect } from "react";

interface Testimonial {
  name: string;
  scoreImprovement: string;
  quote: string;
  avatar?: string;
}

interface TestimonialsProps {
  testimonials: Testimonial[];
  trustText?: string;
}

export default function Testimonials({
  testimonials,
  trustText = "Trusted by 1,700+ students climbing to their target scores",
}: TestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const x = useMotionValue(0);
  const springConfig = { stiffness: 100, damping: 30, mass: 0.5 };
  const xSpring = useSpring(x, springConfig);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Update x value when currentIndex changes
  useEffect(() => {
    x.set(-currentIndex * 100);
  }, [currentIndex, x]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  // Calculate positions for visible cards (current, prev, next)
  const getCardPosition = (index: number) => {
    const offset = index - currentIndex;
    const normalizedOffset = ((offset % testimonials.length) + testimonials.length) % testimonials.length;
    
    if (normalizedOffset === 0) return 0; // Current
    if (normalizedOffset === 1) return 1; // Next
    if (normalizedOffset === testimonials.length - 1) return -1; // Previous
    
    return null; // Not visible
  };

  return (
    <section id="testimonials" className="relative px-6 md:px-12 lg:px-16 section-spacing bg-gradient-to-b from-transparent to-slate-900/20">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-slate-600 mb-3 font-semibold">
            Success Stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Real climbers, real results
          </h2>
          <p className="text-base text-slate-700 leading-relaxed font-medium">
            See how students like you reached their target scores
          </p>
          {trustText && (
            <p className="text-sm text-slate-600 mt-3 font-medium">
              {trustText}
            </p>
          )}
        </motion.div>


        {/* Carousel Container */}
        <div className="relative mb-8">
          <div className="relative h-[380px] md:h-[380px] overflow-visible" style={{ perspective: "1000px", transformStyle: "preserve-3d" }}>
            <div className="relative w-full h-full flex items-center justify-center" style={{ willChange: "transform" }}>
              {testimonials.map((testimonial, index) => {
                const position = getCardPosition(index);
                if (position === null) return null;

                const isCurrent = position === 0;

                // Calculate transform values for 3D rotation - increased spacing
                const translateX = position * 180; // Adjusted for smaller card
                const translateZ = isCurrent ? 0 : -120; // Push side cards back
                const rotateY = position * 15; // Reduced rotation angle
                const scale = isCurrent ? 1 : 0.8; // Make side cards smaller
                const opacity = isCurrent ? 1 : 0.4; // Make side cards more transparent
                const zIndex = isCurrent ? 10 : position === 1 ? 2 : 1; // Ensure current card is on top

                return (
                  <motion.div
                    key={index}
                    className="absolute w-[380px] h-[380px] px-4"
                    animate={{
                      x: translateX,
                      scale: scale,
                      opacity: opacity,
                    }}
                    style={{
                      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      transformStyle: "preserve-3d",
                      zIndex: zIndex,
                      pointerEvents: isCurrent ? "auto" : "none", // Only current card is interactive
                      willChange: "transform, opacity", // Optimize for performance
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 30,
                      mass: 0.5,
                    }}
                  >
                    <div className="premium-card pricing-card-no-hover w-full h-full p-6 md:p-8 relative overflow-hidden">
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        {/* Quote */}
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="flex items-start gap-2.5 mb-3">
                            <svg
                              className="w-6 h-6 md:w-7 md:h-7 text-slate-500 flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 32 32"
                            >
                              <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm16 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
                            </svg>
                            <p className="text-slate-800 leading-relaxed text-base md:text-lg lg:text-xl font-medium flex-1">
                              &ldquo;{testimonial.quote}&rdquo;
                            </p>
                          </div>
                        </div>

                        {/* Author Info */}
                        <div className="pt-3 border-t-2 border-slate-200 mt-auto">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <h4 className="font-bold text-slate-900 text-lg md:text-xl">
                              {testimonial.name}
                            </h4>
                            <div className="flex items-center gap-3">
                              <div className="px-3 py-1.5 bg-sky-500 rounded shadow-lg">
                                <p className="text-white font-bold text-base md:text-lg">
                                  {testimonial.scoreImprovement}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-8 z-20 w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
            aria-label="Previous testimonial"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-8 z-20 w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
            aria-label="Next testimonial"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center items-center gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-sky-500 w-8"
                  : "bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

