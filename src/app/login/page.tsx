"use client";

import React, { useState, useEffect } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PrimaryButton from "@/components/ui/PrimaryButton";
import InputField from "@/components/ui/InputField";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
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
    <main className="min-h-screen flex items-center justify-center px-6 py-12 relative">
      {/* Back to Home Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
        <Logo href="/" size="md" />
      </div>
      <div className="w-full mx-auto">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-center flex-1"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-slate-600">
            Welcome Back
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-tight">
            Continue your climb to the peak.
          </h1>
          <p className="text-slate-700 text-lg max-w-xl mx-auto">
            Sign in to access your personalized study plans, practice tests, and track your progress.
          </p>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {["Practice tests", "Study plans", "Flashcards", "Progress tracking"].map(
              (item) => (
                <div key={item} className="flex items-center gap-3 text-slate-700">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sky-600">
                    ✦
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              )
            )}
          </div>
        </motion.div>

        <div className="w-full max-w-md">
          <GlassPanel delay={0.15}>
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
            Sign in to your account
          </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
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
          <p className="text-sm text-slate-600 text-center mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-sky-600 hover:text-sky-700 font-medium">
              Sign up
            </Link>
          </p>
          </GlassPanel>
        </div>
        </div>
      </div>
    </main>
  );
}
