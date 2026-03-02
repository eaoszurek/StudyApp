import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Flashcards",
  description:
    "Review SAT concepts with AI-generated flashcards and spaced repetition to improve long-term retention.",
  path: "/flashcards",
});

export default async function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

