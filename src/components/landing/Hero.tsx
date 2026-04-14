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
        className="relative px-6 md:px-12 lg:px-16 section-spacing min-h-[80vh] flex items-center overflow-x-hidden overflow-y-visible"
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
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-gradient-hero font-extrabold tracking-[-0.03em] leading-[1.15] pb-1.5 [overflow:visible]"
              >
                {headline.split(",").map((line, idx) => (
                  <span key={idx} className="block">
                    {line.trim()}
                  </span>
                ))}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-base md:text-lg text-slate-700 max-w-xl leading-relaxed font-medium mx-auto lg:mx-0"
              >
                {subhead}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start pt-2"
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/signup"
                    className="block px-8 py-4 text-base font-bold text-white bg-sky-600 rounded-lg shadow-[0_10px_20px_-5px_rgba(14,165,233,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(14,165,233,0.4)] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 transition-all duration-300"
                    aria-label="Primary call to action"
                  >
                    {ctaPrimary}
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a
                    href="#how-it-works"
                    onClick={handleScrollToHowItWorks}
                    className="block px-8 py-4 text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-lg shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all duration-300"
                    aria-label="Secondary call to action"
                  >
                    {ctaSecondary}
                  </a>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Visual - Device Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex items-center justify-center mt-2 sm:mt-4 lg:mt-0"
              aria-label="Hero visual"
            >
              <div className="relative w-full max-w-[340px] sm:max-w-xl mx-auto">
                {/* Glow Effect Behind Mockup */}
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-green-500/10 to-sky-500/10 rounded-full blur-[100px] transform scale-150 -z-10" />
                
                {/* Device Mockup */}
                <DeviceMockup type="desktop" className="relative z-10 drop-shadow-2xl">
                  <div className="w-full h-full p-2 sm:p-3 bg-slate-50/50">
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
