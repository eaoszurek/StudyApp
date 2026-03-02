import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Micro-Lessons",
  description:
    "Study SAT topics in short, focused micro-lessons with examples, quick checks, and clear explanations.",
  path: "/lessons",
});

export default async function LessonsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

