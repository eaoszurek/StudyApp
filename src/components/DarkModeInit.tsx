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

    // Default to dark mode unless the user has explicitly chosen light
    const shouldBeDark = saved !== null ? saved === "true" : true;

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}

