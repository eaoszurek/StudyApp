"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/ui/Logo";

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="w-full bg-white/90 backdrop-blur-sm border-b border-slate-200">
      <div className="flex items-center h-14">
        {/* Logo - positioned at absolute left edge */}
        <div className="pl-2 flex-shrink-0">
          <Logo href="/" size="lg" showText={false} />
        </div>
        
        {/* Navigation container */}
        <div className="flex-1 max-w-5xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="flex items-center justify-end h-14">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link
                href="#features"
                onClick={(e) => handleScrollToSection(e, "features")}
                className="text-slate-700 hover:text-slate-900 text-sm lg:text-base font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                onClick={(e) => handleScrollToSection(e, "pricing")}
                className="text-slate-700 hover:text-slate-900 text-sm lg:text-base font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="text-slate-700 hover:text-slate-900 text-sm lg:text-base font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm lg:text-base font-semibold rounded-md shadow-md hover:shadow-lg transition-all"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 transition-colors"
              aria-label="Menu"
            >
              <span className="text-2xl">{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 border-t border-slate-200"
            >
              <div className="flex flex-col gap-3 pt-4">
                <Link
                  href="#features"
                  onClick={(e) => handleScrollToSection(e, "features")}
                  className="text-slate-700 hover:text-slate-900 font-medium py-2 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="#pricing"
                  onClick={(e) => handleScrollToSection(e, "pricing")}
                  className="text-slate-700 hover:text-slate-900 font-medium py-2 transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-slate-900 font-medium py-2 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-md text-center transition-all"
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}

