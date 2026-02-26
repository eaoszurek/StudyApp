import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "SAT Linear Equations Practice | Free Digital SAT Math",
  description:
    "Master linear equations for the Digital SAT. Practice solving, graphing, and word problems with clear explanations. Free SAT linear equations practice to raise your score.",
  path: "/sat-linear-equations-practice",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
