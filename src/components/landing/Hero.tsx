"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ParallaxMountains from "./ParallaxMountains";
import DeviceMockup from "./DeviceMockup";
import AppMockup from "./mockups/AppMockup";

interface HeroProps {
  variant: "A" | "B";
  headline: string;
  subhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export default function Hero({
  variant,
  headline,
  subhead,
  ctaPrimary,
  ctaSecondary,
}: HeroProps) {

  const handleScrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("how-it-works");
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* Parallax Background */}
      <ParallaxMountains />

      <section
        className="relative px-6 md:px-12 lg:px-16 section-spacing min-h-[80vh] flex items-center overflow-hidden"
        aria-label="Hero section"
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-center lg:text-left space-y-6 z-10"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-gradient-hero leading-[1.1] font-bold"
              >
                {headline.split(",").map((line, idx) => (
                  <span key={idx} className="block">
                    {line.trim()}{idx === 0 ? "," : ""}
                  </span>
                ))}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-base md:text-lg text-slate-700 max-w-xl leading-relaxed font-medium"
              >
                {subhead}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start pt-2"
              >
                <Link
                  href="/signup"
                  className="px-8 py-4 text-base font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-white transition-all duration-300"
                  aria-label="Primary call to action"
                  style={{ transform: 'none' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.05)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(14, 165, 233, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {ctaPrimary}
                </Link>
                <a
                  href="#how-it-works"
                  onClick={handleScrollToHowItWorks}
                  className="px-8 py-4 text-base font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-lg hover:shadow-xl border-2 border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white transition-all duration-300"
                  aria-label="Secondary call to action"
                  style={{ transform: 'none' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(15, 23, 42)';
                    e.currentTarget.style.borderColor = 'rgb(51, 65, 85)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                    e.currentTarget.style.borderColor = 'rgb(51, 65, 85)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {ctaSecondary}
                </a>
              </motion.div>
            </motion.div>

            {/* Right Visual - Device Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="relative z-10 flex items-center justify-center"
              aria-label="Hero visual"
            >
              <div className="relative w-full max-w-xl mx-auto">
                {/* Glow Effect Behind Mockup */}
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-green-500/20 to-sky-500/20 rounded-lg blur-3xl transform scale-110 -z-10" />
                
                {/* Device Mockup */}
                <DeviceMockup type="desktop" className="relative z-10">
                  <div className="w-full h-full p-2 sm:p-3">
                    <AppMockup />
                  </div>
                </DeviceMockup>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 gradient-overlay pointer-events-none" />
      </section>

    </>
  );
}
