"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SettingsSidebar from "./SettingsSidebar";
import Logo from "./ui/Logo";
import FeatureIcon from "./ui/FeatureIcon";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/practice", label: "Practice Tests", icon: "practice" as const },
  { href: "/study-plan", label: "Study Plans", icon: "study-plan" as const },
  { href: "/flashcards", label: "Flashcards", icon: "flashcards" as const },
  { href: "/lessons", label: "Micro-Lessons", icon: "lessons" as const },
  { href: "/progress", label: "Progress", icon: "progress" as const },
];

export default function Navigation({
  variant = "sidebar",
  isCollapsed = false,
  onToggleCollapse,
}: {
  variant?: "sidebar" | "mobile";
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  if (variant === "mobile") {
    return (
      <>
        <nav className="app-navbar md:hidden h-14 flex items-center justify-between pl-2 pr-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <Logo href="/dashboard" size="md" showText={false} onClick={() => handleNavClick()} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg"
              aria-label="Settings"
            >
              <FeatureIcon name="settings" size={22} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <FeatureIcon name="close" size={22} /> : <FeatureIcon name="menu" size={22} />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-14 left-0 right-0 md:hidden border-b border-slate-200 dark:border-slate-800 py-3 shadow-lg z-[110] app-navbar bg-white dark:bg-slate-900"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <FeatureIcon name={item.icon} size={20} />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
        <SettingsSidebar isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  return (
    <>
      <nav className="app-navbar w-full h-full min-h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className={`py-4 pr-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 ${isCollapsed ? "pl-3" : "pl-2"}`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-2"}`}>
            {!isCollapsed && <Logo href="/dashboard" size="md" showText={true} />}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-2" : "gap-3 px-4"
                } ${
                  isActive
                    ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-r-2 border-sky-500"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
                aria-label={item.label}
                title={isCollapsed ? item.label : undefined}
              >
                <FeatureIcon name={item.icon} size={20} />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </div>
        <div className={`p-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors ${
              isCollapsed ? "justify-center h-10 w-10" : "gap-3 w-full px-4 py-2.5"
            }`}
            aria-label="Settings"
            title={isCollapsed ? "Settings" : undefined}
          >
            <FeatureIcon name="settings" size={20} />
            {!isCollapsed && "Settings"}
          </button>
        </div>
      </nav>
      <SettingsSidebar isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
