"use client";

import React from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { motion } from "framer-motion";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="inline-block mb-8">
            <Logo size="md" showText={true} href="/" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            We're Here to Help You Climb
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Need help with your SAT prep? Email us anytime.
          </p>
        </motion.div>

        {/* Support Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12"
        >
          <div className="text-center space-y-6">
            {/* Email Display */}
            <div className="inline-block">
              <a
                href="mailto:help.peakprep.app@gmail.com"
                className="group inline-flex items-center gap-3 px-6 py-4 bg-sky-600 hover:bg-sky-700 text-white text-lg md:text-xl font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="break-all">help.peakprep.app@gmail.com</span>
              </a>
            </div>

            {/* Support Message */}
            <div className="space-y-4 pt-4">
              <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                Whether you have questions about your study plan, need help with a feature, or want to share feedback about your journey, we're here to support you every step of the way.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
                We typically respond within 24 hours. Keep climbing towards your target score! 🏔️
              </p>
            </div>
          </div>
        </motion.div>

        {/* Additional Resources */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            You can also check out our{" "}
            <Link href="/terms" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline font-medium">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline font-medium">
              Privacy Policy
            </Link>
            .
          </p>
          <Link
            href="/"
            className="inline-block text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 text-sm font-medium mt-4"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </main>
  );
}

