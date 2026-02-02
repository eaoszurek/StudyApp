"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Hero from "@/components/landing/Hero";
import StepSection from "@/components/landing/StepSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { landingContent } from "@/data/landing-content";

// Use variant A by default (can be changed to "B" for A/B testing)
const HERO_VARIANT: "A" | "B" = "A";

export default function Home() {
  const [heroVariant] = useState<"A" | "B">(HERO_VARIANT);
  const heroContent = landingContent.hero[heroVariant === "A" ? "variantA" : "variantB"];

  // Force light mode on landing page
  useEffect(() => {
    // Store the current dark mode state
    const wasDark = document.documentElement.classList.contains("dark");
    
    // Remove dark mode for landing page
    document.documentElement.classList.remove("dark");
    
    // Restore dark mode when leaving the page
    return () => {
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  return (
    <main className="relative overflow-hidden">
      {/* Navigation Bar */}
      <LandingNavbar />

      {/* 1. Hero Section with Parallax Background */}
      <Hero
        variant={heroVariant}
        headline={heroContent.headline}
        subhead={heroContent.subhead}
        ctaPrimary={heroContent.ctaPrimary}
        ctaSecondary={heroContent.ctaSecondary}
      />

      {/* 2. Step-Through / How It Works */}
      <StepSection />

      {/* 3. Feature Highlights */}
      <FeatureGrid features={landingContent.features} />

      {/* 4. Testimonials */}
      <Testimonials
        testimonials={landingContent.testimonials}
        trustText={landingContent.trustBar.text}
      />

      {/* 6. Pricing */}
      <Pricing tiers={landingContent.pricing.tiers} faq={landingContent.pricing.faq} />

      {/* 7. Final CTA Section */}
      <section className="relative px-6 md:px-12 lg:px-16 section-spacing">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="premium-card pricing-card-no-hover p-10 md:p-12 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-green-500/10 to-blue-500/10 blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Ready to start your climb?
              </h2>
              <p className="text-base md:text-lg text-slate-700 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
                Join thousands of students on their journey to SAT success. Start free, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="px-8 py-3.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-lg hover:shadow-xl focus:outline-none transition-all"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "cta_click", {
                        event_category: "conversion",
                        event_label: "final_cta",
                      });
                    }
                  }}
                >
                  Begin Your Ascent
                </Link>
                <Link
                  href="/signup"
                  className="px-8 py-3.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-md hover:shadow-lg transition-all"
                >
                  Try a Checkpoint
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 8. Footer */}
      <Footer />
    </main>
  );
}
