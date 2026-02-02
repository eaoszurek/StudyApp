"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { TERMS_LAST_UPDATED } from "@/lib/policy";

export default function TermsOfService() {
  // Force light mode on terms page
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
            Terms of Service
          </h1>
          <p className="text-slate-600 text-sm">Last updated: {TERMS_LAST_UPDATED}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Agreement to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using Peak Prep ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service. Peak Prep is a personalized AI study guide for the SAT® exam.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Use License</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Permission is granted to use Peak Prep for personal, non-commercial educational purposes. This license does not include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>Reselling or sublicensing the Service</li>
              <li>Using the Service for commercial purposes without permission</li>
              <li>Attempting to reverse engineer or extract source code</li>
              <li>Removing copyright or proprietary notations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">User Accounts</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              To access certain features, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Acceptable Use</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit any harmful code, viruses, or malicious software</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">AI-Generated Content</h2>
            <p className="text-slate-700 leading-relaxed">
              Peak Prep uses artificial intelligence to generate educational content, including practice questions, flashcards, and study plans. This content is provided for educational purposes only. We do not guarantee the accuracy, completeness, or usefulness of AI-generated content. The content should be used as a study aid and is not a replacement for official SAT® preparation materials or professional educational guidance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">No Guarantees</h2>
            <p className="text-slate-700 leading-relaxed font-semibold">
              Peak Prep makes no guarantees, representations, or warranties regarding SAT® score improvements, test performance, or educational outcomes. Your use of the Service does not guarantee any specific results on the SAT® exam or any other test. Individual results may vary.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Subscription and Payments</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Some features of Peak Prep require a paid subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-relaxed ml-4">
              <li>Pay all fees associated with your subscription</li>
              <li>Automatic renewal unless cancelled</li>
              <li>Fees are processed through Stripe, our payment processor</li>
              <li>Cancellation terms as specified at the time of purchase</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              Refund policies, if any, will be specified at the time of purchase.
            </p>
            <p className="text-slate-700 leading-relaxed mt-4">
              Subscriptions renew automatically each billing period unless cancelled through the Stripe billing portal. You
              will retain access to premium features until the end of the current billing period after cancellation. Except
              where required by law, payments are non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Intellectual Property</h2>
            <p className="text-slate-700 leading-relaxed">
              The Service and its original content, features, and functionality are owned by Peak Prep and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              To the maximum extent permitted by law, Peak Prep shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Termination</h2>
            <p className="text-slate-700 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. You may also terminate your account at any time by contacting us or using the account deletion feature, if available.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Age Requirements</h2>
            <p className="text-slate-700 leading-relaxed">
              Peak Prep is intended for users who are at least 13 years old. If you are under 18, you represent that you have your parent's or guardian's permission to use the Service and that they have agreed to these Terms on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Disclaimer</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Peak Prep is not affiliated with, endorsed by, or connected to College Board, the organization that administers the SAT® exam. Our Service provides educational assistance and practice materials only. The content generated by our Service is not official SAT® material and should not be considered as such.
            </p>
            <p className="text-slate-700 leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of the United States.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact Information</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:help.peakprep.app@gmail.com" className="text-sky-600 hover:text-sky-700 underline">
                help.peakprep.app@gmail.com
              </a>
              .
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

