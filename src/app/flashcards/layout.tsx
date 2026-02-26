import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Flashcards",
  description:
    "Review SAT concepts with AI-generated flashcards and spaced repetition to improve long-term retention.",
  path: "/flashcards",
});

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

