import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Micro-Lessons",
  description:
    "Study SAT topics in short, focused micro-lessons with examples, quick checks, and clear explanations.",
  path: "/lessons",
});

export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

