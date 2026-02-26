import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Algebra Practice Questions | Free Digital SAT Prep",
  description:
    "Master SAT algebra with practice questions for the Digital SAT. Learn what's tested, avoid common mistakes, and improve your score. Free practice with explanations.",
  path: "/sat-algebra-practice-questions",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
