import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Progress Tracking",
  description: "Track your SAT practice history, section scores, and overall growth over time.",
  path: "/progress",
  noIndex: true,
});

export default async function ProgressLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}

