"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DarkModeInit() {
  const pathname = usePathname();

  useEffect(() => {
    // Check if we're on the landing page
    const isLandingPage = pathname === "/";

    // Force light mode on landing page
    if (isLandingPage) {
      document.documentElement.classList.remove("dark");
      return;
    }

    // Apply dark mode for other pages based on preference
    const saved = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = saved ? saved === "true" : prefersDark;
    
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}

