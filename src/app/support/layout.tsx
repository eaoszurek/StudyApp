import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Support",
  description:
    "Contact PeakPrep support for help with your account, billing, and SAT prep features.",
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}

