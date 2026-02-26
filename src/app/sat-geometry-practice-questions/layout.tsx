import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Geometry Practice Questions | Digital SAT Math Prep",
  description:
    "Practice SAT geometry questions for the Digital SAT. Area, angles, circles, and triangles with clear explanations. Free geometry practice to boost your math score.",
  path: "/sat-geometry-practice-questions",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
