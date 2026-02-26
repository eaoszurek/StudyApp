import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Hard SAT Math Questions | Practice Tough Digital SAT",
  description:
    "Practice hard SAT math questions for the Digital SAT. Multi-step problems, tricky wording, and advanced topics with clear explanations. Get ready for the hardest questions.",
  path: "/hard-sat-math-questions",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
