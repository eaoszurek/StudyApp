import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Quadratics Practice | Digital SAT Math Questions",
  description:
    "Practice SAT quadratics for the Digital SAT. Factoring, the quadratic formula, and parabolas with clear explanations. Free quadratic practice to boost your math score.",
  path: "/sat-quadratics-practice",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
