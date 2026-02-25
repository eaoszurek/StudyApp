"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function Error({
  error,
  reset,
  params,
  searchParams,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  // Unwrap params/searchParams to prevent React DevTools serialization errors
  React.use(params);
  React.use(searchParams);
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
    // Hide navbar by adding a class to body
    document.body.setAttribute("data-hide-nav", "true");
    return () => {
      document.body.removeAttribute("data-hide-nav");
    };
  }, [error]);

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
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Hit a bump? Let's try a different route.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm sm:text-base">
            We encountered an unexpected error. Please try again or return to base camp.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryButton onClick={reset} variant="secondary">
              Try Again
            </PrimaryButton>
            <PrimaryButton onClick={() => window.location.href = "/"}>
              Return to Base Camp
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

