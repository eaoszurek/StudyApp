"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4">
      <div className="mx-auto max-w-3xl rounded-xl bg-white shadow-xl border border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-slate-600 flex-1">
          We use essential cookies to keep you signed in and track your study
          progress. No advertising or third-party tracking cookies are used.{" "}
          <Link
            href="/privacy"
            className="text-sky-600 hover:text-sky-700 underline"
          >
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-5 py-2 transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
