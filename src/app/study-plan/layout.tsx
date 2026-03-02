import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Study Plan Generator",
  description:
    "Build a personalized SAT study plan with weekly goals, daily tasks, and section-specific priorities.",
  path: "/study-plan",
});

export default async function StudyPlanLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

