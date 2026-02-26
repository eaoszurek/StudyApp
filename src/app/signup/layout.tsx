import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign Up",
  description:
    "Create your PeakPrep account to get a personalized SAT study plan, practice tests, and flashcards.",
  path: "/signup",
  noIndex: true,
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

