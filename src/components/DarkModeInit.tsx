"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const FEATURE_PATHS = [
  "/dashboard",
  "/practice",
  "/study-plan",
  "/flashcards",
  "/lessons",
  "/progress",
];

export default function DarkModeInit() {
  const pathname = usePathname();

  useEffect(() => {
    const isFeaturePage = FEATURE_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (!isFeaturePage) {
      document.documentElement.classList.remove("dark");
      return;
    }

    const saved = localStorage.getItem("darkMode");

    // Default to light mode for new users; respect saved preference after that
    const shouldBeDark = saved === "true";

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}

