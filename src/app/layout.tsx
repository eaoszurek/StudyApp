import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Oswald } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import DarkModeInit from "@/components/DarkModeInit";
import CookieConsent from "@/components/ui/CookieConsent";

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
  title: "PeakPrep — Mountain-themed SAT prep app",
  description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "PeakPrep — Mountain-themed SAT prep app",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PeakPrep — Mountain-themed SAT prep app",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, and checkpoint practice tests.",
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
