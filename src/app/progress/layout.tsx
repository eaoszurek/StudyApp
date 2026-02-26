import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Progress Tracking",
  description: "Track your SAT practice history, section scores, and overall growth over time.",
  path: "/progress",
  noIndex: true,
});

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}

