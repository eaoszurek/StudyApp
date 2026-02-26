import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Study Plan Generator",
  description:
    "Build a personalized SAT study plan with weekly goals, daily tasks, and section-specific priorities.",
  path: "/study-plan",
});

export default function StudyPlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}

