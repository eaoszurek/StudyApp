"use client";

import React from "react";

interface PremiumGateModalProps {
  open: boolean;
  onClose: () => void;
}

async function startCheckout() {
  const response = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceType: "monthly" }),
  });
  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
    return;
  }
  throw new Error(data.error || "Failed to start checkout");
}

export default function PremiumGateModal({ open, onClose }: PremiumGateModalProps) {
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 shadow-xl p-6">
        <h2
          id="premium-gate-title"
          className="text-lg font-bold text-slate-900 dark:text-white"
        >
          Free starter limit reached
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 font-medium leading-relaxed">
          Free starter limit reached. Unlock Plus for $5/month to continue.
        </p>
        {checkoutError && (
          <p className="text-sm text-rose-600 dark:text-rose-400 mt-3 font-medium">{checkoutError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={async () => {
              setCheckoutError(null);
              setCheckoutLoading(true);
              try {
                await startCheckout();
              } catch (err) {
                setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout");
              } finally {
                setCheckoutLoading(false);
              }
            }}
            className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            {checkoutLoading ? "Loading…" : "Upgrade to Plus"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export function isPremiumGateError(status: number, message: string): boolean {
  return (
    status === 402 ||
    message.toLowerCase().includes("free starter limit") ||
    message.toLowerCase().includes("unlock plus")
  );
}
