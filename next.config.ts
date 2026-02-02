import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Suppress Next.js 16 async params/searchParams warnings in development
  // These are false positives since all pages are client components
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Exclude Prisma and libsql packages from Turbopack bundling
  // These packages contain native bindings and non-JS files that cause build errors
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],
  // Configure Turbopack (empty config to use Turbopack instead of webpack)
  turbopack: {},
};

export default nextConfig;
