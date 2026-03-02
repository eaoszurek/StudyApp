import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Practice Tests",
  description:
    "Generate SAT practice tests for math, reading, and writing with instant explanations and strategy tips.",
  path: "/practice",
});

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

