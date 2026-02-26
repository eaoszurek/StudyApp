import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Digital SAT Math Practice Test | Free Full-Length Prep",
  description:
    "Take a free Digital SAT math practice test. Adaptive-style questions, instant scoring, and explanations. Get ready for the real Digital SAT math section.",
  path: "/digital-sat-math-practice-test",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
