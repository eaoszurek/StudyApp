"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hideNavState, setHideNavState] = useState(false);
  
  useEffect(() => {
    // Check if body has data-hide-nav attribute (set by error/not-found pages)
    const checkHideNav = () => {
      setHideNavState(document.body.hasAttribute("data-hide-nav"));
    };
    checkHideNav();
    
    // Set up a mutation observer to watch for changes to the data-hide-nav attribute
    const observer = new MutationObserver(checkHideNav);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-hide-nav"] });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  const baseNoNavRoutes = ["/", "/signup", "/login"];
  const staticNoNavPrefixes = ["/terms", "/privacy", "/support"];
  const hideNav =
    pathname === null ||
    hideNavState ||
    baseNoNavRoutes.includes(pathname) ||
    staticNoNavPrefixes.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-slate-100">
      {/* Mountain-themed background - only for non-landing pages */}
      {!hideNav && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          {/* Mountain SVG Background - Dark Mode */}
          <div className="absolute inset-0 dark:opacity-40 opacity-0">
            {/* Background Layer 1 - Far mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain1-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E5532" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#2d5f3f" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.15" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L200,500 L400,600 L600,400 L800,550 L1000,350 L1200,450 L1440,300 L1440,800 Z"
                  fill="url(#mountain1-dark)"
                />
              </svg>
            </div>

            {/* Background Layer 2 - Middle mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain2-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2d5f3f" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#3A3F47" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1E5532" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L150,450 L350,550 L550,300 L750,450 L950,250 L1150,350 L1440,200 L1440,800 Z"
                  fill="url(#mountain2-dark)"
                />
              </svg>
            </div>

            {/* Background Layer 3 - Foreground mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain3-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#2d5f3f" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3A3F47" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L100,400 L300,500 L500,250 L700,400 L900,200 L1100,300 L1440,150 L1440,800 Z"
                  fill="url(#mountain3-dark)"
                />
              </svg>
            </div>
          </div>

          {/* Mountain SVG Background - Light Mode */}
          <div className="absolute inset-0 dark:opacity-0 opacity-50">
            {/* Background Layer 1 - Far mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain1-light" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a8c4d8" stopOpacity="0.35" />
                    <stop offset="50%" stopColor="#a8c8b8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c8dae8" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L200,500 L400,600 L600,400 L800,550 L1000,350 L1200,450 L1440,300 L1440,800 Z"
                  fill="url(#mountain1-light)"
                />
              </svg>
            </div>

            {/* Background Layer 2 - Middle mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain2-light" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#98c0b8" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#98b8d0" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#b8d0e0" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L150,450 L350,550 L550,300 L750,450 L950,250 L1150,350 L1440,200 L1440,800 Z"
                  fill="url(#mountain2-light)"
                />
              </svg>
            </div>

            {/* Background Layer 3 - Foreground mountains */}
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 1440 800"
                className="w-full h-full"
                preserveAspectRatio="xMidYMin slice"
              >
                <defs>
                  <linearGradient id="mountain3-light" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#88b4d8" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#88b8a8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a8c4d8" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,800 L100,400 L300,500 L500,250 L700,400 L900,200 L1100,300 L1440,150 L1440,800 Z"
                  fill="url(#mountain3-light)"
                />
              </svg>
            </div>
          </div>

          {/* Gradient Overlay for readability with green accents */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0F172A]/80 dark:to-[#0F172A]/90" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E5532]/5 via-transparent to-[#1E5532]/10 dark:from-[#1E5532]/10 dark:via-transparent dark:to-[#1E5532]/15" />
        </div>
      )}
      {/* Original gradient blobs for landing page */}
      {hideNav && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-20 w-80 h-80 bg-cyan-500/30 dark:bg-cyan-500/10 blur-3xl rounded-full" />
          <div className="absolute top-10 right-[-10%] w-[30rem] h-[30rem] bg-purple-500/25 dark:bg-purple-500/10 blur-[140px]" />
          <div className="absolute bottom-[-15rem] left-1/2 -translate-x-1/2 w-[40rem] h-[35rem] bg-sky-500/15 dark:bg-sky-500/10 blur-[180px]" />
        </div>
      )}
      <div className="flex flex-col min-h-screen w-full max-w-full">
        {!hideNav && (
          <div className="sticky top-0 z-[100] w-full">
            <Navigation />
          </div>
        )}
        <div className={`relative z-0 w-full max-w-full ${hideNav ? "" : "pt-6 sm:pt-8 md:pt-10 pb-6 sm:pb-8 md:pb-10"}`}>{children}</div>
      </div>
    </div>
  );
}

