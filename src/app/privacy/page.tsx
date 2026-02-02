"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { PRIVACY_LAST_UPDATED } from "@/lib/policy";

export default function PrivacyPolicy() {
  // Force light mode on privacy page
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => {
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo size="md" showText={true} href="/" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-600 text-sm">Last updated: {PRIVACY_LAST_UPDATED}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              Peak Prep ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service, a personalized AI study guide for the SAT® exam.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Information We Collect</h2>
            <div className="space-y-3 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Account Information</h3>
                <p className="leading-relaxed">
                  When you create an account, we collect your email address and name. Your password is securely hashed and never stored in plain text.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Usage Data</h3>
                <p className="leading-relaxed">
                  We collect data about how you use Peak Prep, including practice tests you complete, flashcards you create, study plans you generate, and your progress and scores. This data helps us provide and improve our services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Session Information</h3>
                <p className="leading-relaxed">
                  We use session cookies and identifiers to maintain your login state and track your progress across sessions. You can use some features anonymously without creating an account.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>To provide and maintain our service</li>
              <li>To generate personalized study content using AI</li>
              <li>To track your progress and performance</li>
              <li>To process payments for premium subscriptions</li>
              <li>To communicate with you about your account and our services</li>
              <li>To improve and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">AI-Generated Content</h2>
            <p className="text-slate-700 leading-relaxed">
              Peak Prep uses artificial intelligence (OpenAI) to generate practice questions, flashcards, study plans, and educational content. This content is created for educational purposes only and is not official SAT® material. We do not guarantee the accuracy or completeness of AI-generated content, and it should be used as a study aid, not a replacement for official SAT® preparation materials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Cookies and Sessions</h2>
            <p className="text-slate-700 leading-relaxed">
              We use cookies and session storage to keep you logged in, remember your preferences, and track your progress. These are essential for the service to function properly. We do not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Storage and Security</h2>
            <p className="text-slate-700 leading-relaxed">
              Your data is stored securely in our database. We use industry-standard security measures, including password hashing and secure session management. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We use the following third-party services that may collect information:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li><strong>Stripe:</strong> For payment processing. Stripe handles all payment data in accordance with their privacy policy.</li>
              <li><strong>OpenAI:</strong> For generating educational content. Content generation requests are processed by OpenAI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Age Requirements</h2>
            <p className="text-slate-700 leading-relaxed">
              Peak Prep is intended for users who are at least 13 years old. We do not knowingly collect personal information from children under 13. If you are under 18, you should have your parent's or guardian's permission before using our service. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Your Rights</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>Access your personal data</li>
              <li>Delete your account and data</li>
              <li>Request corrections to your data</li>
              <li>Export your data</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to This Privacy Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:help.peakprep.app@gmail.com" className="text-sky-600 hover:text-sky-700 underline">
                help.peakprep.app@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600 italic">
              <strong>Important Disclaimer:</strong> Peak Prep is not affiliated with or endorsed by College Board, the organization that administers the SAT® exam. Our service provides educational assistance only and is not official SAT® material.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sky-600 hover:text-sky-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

