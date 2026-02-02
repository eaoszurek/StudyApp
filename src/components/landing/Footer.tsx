"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Footer() {
  return (
    <footer className="relative px-6 md:px-12 lg:px-16 py-20 md:py-24 border-t border-slate-200 bg-gradient-to-b from-transparent to-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo size="md" showText={false} href="/" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium max-w-xs">
              Your expedition to SAT success. Climb your way to your target score.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Product</h4>
            <ul className="space-y-3 text-xs text-slate-600">
              <li>
                <Link
                  href="/signup"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Practice Tests
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Study Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Flashcards
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Progress
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-3 text-xs text-slate-600">
              <li>
                <Link
                  href="/support"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Support
                </Link>
              </li>
              <li className="text-slate-500 text-xs mt-2">
                Peak Prep is not affiliated with or endorsed by College Board
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3 text-xs text-slate-600">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-sky-600 transition-colors inline-block font-medium"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-xs font-medium">
            &copy; {new Date().getFullYear()} Peak Prep. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
