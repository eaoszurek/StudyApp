"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function NotFound({
  params,
  searchParams,
}: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  // Unwrap params/searchParams to prevent React DevTools serialization errors
  React.use(params);
  React.use(searchParams);
  
  useEffect(() => {
    // Hide navbar by adding a class to body
    document.body.setAttribute("data-hide-nav", "true");
    return () => {
      document.body.removeAttribute("data-hide-nav");
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="text-center max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 flex justify-center">
            <Logo href="/" size="lg" showText={false} />
          </div>
          <h1 className="text-6xl sm:text-8xl font-bold text-slate-200 dark:text-slate-700 mb-4">404</h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Trail Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm sm:text-base">
            This route doesn't exist. Let's get you back to base camp.
          </p>
          <PrimaryButton onClick={() => window.location.href = "/"}>
            Return to Base Camp
          </PrimaryButton>
        </motion.div>
      </div>
    </main>
  );
}

