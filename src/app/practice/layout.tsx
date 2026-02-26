import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Practice Tests",
  description:
    "Generate SAT practice tests for math, reading, and writing with instant explanations and strategy tips.",
  path: "/practice",
});

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

