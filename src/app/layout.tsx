import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Oswald } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import DarkModeInit from "@/components/DarkModeInit";
import CookieConsent from "@/components/ui/CookieConsent";
import { absoluteUrl, siteUrl } from "@/lib/seo";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PeakPrep | AI SAT Prep App",
    template: "%s | PeakPrep",
  },
  description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  keywords: [
    "SAT prep",
    "SAT practice tests",
    "SAT study plan",
    "SAT flashcards",
    "SAT reading practice",
    "SAT writing practice",
    "SAT math practice",
  ],
  icons: {
    icon: [{ url: "/favicon.svg" }],
    apple: [{ url: "/favicon.svg" }],
  },
  openGraph: {
    title: "PeakPrep | AI SAT Prep App",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
    url: absoluteUrl("/"),
    type: "website",
    siteName: "PeakPrep",
    images: [absoluteUrl("/opengraph-image")],
  },
  twitter: {
    card: "summary_large_image",
    title: "PeakPrep | AI SAT Prep App",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, and checkpoint practice tests.",
    images: [absoluteUrl("/twitter-image")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body
        className={`${montserrat.variable} ${geistMono.variable} ${oswald.variable} antialiased`}
        suppressHydrationWarning
      >
        <DarkModeInit />
        <LayoutWrapper>{children}</LayoutWrapper>
        <CookieConsent />
      </body>
    </html>
  );
}
