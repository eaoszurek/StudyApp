"use client";

import React, { useState, useEffect } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import InputField from "@/components/ui/InputField";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import FeatureIcon from "@/components/ui/FeatureIcon";
import { validateEmail } from "@/utils/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force light mode on login page
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => {
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate email format
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to sign in. Please try again.");
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-white relative">
      {/* Back to Home Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <Logo href="/" size="md" />
      </div>
      <div className="w-full mx-auto max-w-[360px] min-w-[280px]">
        <div className="flex flex-col gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 text-center w-full"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-slate-600">
            Welcome Back
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
            Continue your climb to the peak.
          </h1>
          <p className="text-slate-700 text-base mx-auto">
            Sign in to access your personalized study plans, practice tests, and track your progress.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2 mx-auto">
            {["Practice tests", "Study plans", "Flashcards", "Progress tracking"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-slate-700">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-sky-600">
                    <FeatureIcon name="sparkles" size={14} />
                  </span>
                  <span className="text-xs font-medium">{item}</span>
                </div>
              )
            )}
          </div>
        </motion.div>

        <div className="w-full">
          <div className="px-5 py-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-3 text-center">
            Sign in to your account
          </h2>
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <InputField
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
            <InputField
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
                {error && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-center font-semibold">
                    {error}
                  </p>
                )}
                <PrimaryButton type="submit" fullWidth disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                  Signing in...
                    </span>
                  ) : (
                "Sign in"
                  )}
                </PrimaryButton>
              </form>
          <p className="text-xs text-slate-600 text-center mt-3">
            Don't have an account?{" "}
            <Link href="/signup" className="text-sky-600 hover:text-sky-700 font-medium">
              Sign up
            </Link>
          </p>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
