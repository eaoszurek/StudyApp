"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import SettingsSidebar from "./SettingsSidebar";
import Logo from "./ui/Logo";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Close mobile menu if open
    setMobileMenuOpen(false);
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/practice", label: "Practice Tests" },
    { href: "/study-plan", label: "Study Plans" },
    { href: "/flashcards", label: "Flashcards" },
    { href: "/lessons", label: "Micro-Lessons" },
    { href: "/progress", label: "Progress" },
  ];

  return (
    <nav className="app-navbar relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14 min-h-[3.5rem]">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo 
              href="/dashboard" 
              size="md" 
              showText={false}
              onClick={(e) => handleNavClick(e as any, "/dashboard")}
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center overflow-hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm lg:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    isActive 
                      ? "text-sky-600 dark:text-sky-400 font-bold" 
                      : "text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side - Settings and Mobile Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex-shrink-0"
              aria-label="Settings"
            >
              <span className="text-lg">⚙️</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0"
              aria-label="Menu"
            >
              <span className="text-xl">{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 md:hidden border-b border-slate-200 dark:border-[#0f172a] py-4 shadow-xl z-[110] app-navbar overflow-visible"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`block px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 font-bold" 
                      : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </div>
      <SettingsSidebar isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </nav>
  );
}
