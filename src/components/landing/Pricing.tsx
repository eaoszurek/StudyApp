"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  originalPrice?: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

interface PricingProps {
  tiers: PricingTier[];
  faq: FAQ[];
}

export default function Pricing({ tiers, faq }: PricingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="pricing" className="relative px-6 md:px-12 lg:px-16 section-spacing bg-gradient-to-b from-transparent to-slate-900/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-20"
      >
        <p className="text-xs uppercase tracking-[0.4em] text-slate-600 mb-3 font-semibold">
          Choose Your Route
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Pricing that scales with your climb
        </h2>
        <p className="text-base text-slate-700 leading-relaxed font-medium">
          Start free, upgrade when you're ready to accelerate your ascent.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2 max-w-lg mx-auto mb-24">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative"
          >
            {tier.popular && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 px-2.5 py-1 bg-brand-gradient text-slate-900 text-[9px] font-bold rounded shadow-glow"
              >
                MOST POPULAR
              </motion.div>
            )}
            <div
              className={`premium-card pricing-card-no-hover h-full p-5 md:p-6 relative overflow-hidden ${
                tier.popular
                  ? "border-2 border-sky-400/50 shadow-glow"
                  : ""
              }`}
            >
              {/* Gradient Overlay for Popular */}
              {tier.popular && (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-green-500/5 to-blue-500/5 pointer-events-none" />
              )}

              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {tier.id === "free" ? "⛺" : tier.id === "pro" ? "⛰️" : "🏔️"}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-2xl md:text-3xl font-bold text-slate-900">
                      {tier.price}
                    </span>
                    {tier.period !== "forever" && (
                      <span className="text-sm text-slate-600 font-medium">/{tier.period}</span>
                    )}
                  </div>
                  {tier.originalPrice && (
                    <p className="text-[9px] text-slate-600 font-medium">
                      <span className="line-through">{tier.originalPrice}</span> per year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((feature, fIdx) => (
                    <li
                      key={fIdx}
                      className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-relaxed"
                    >
                      <span className="text-green-600 mt-0.5 text-sm flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={`mt-auto w-full px-4 py-2.5 rounded font-bold text-xs transition-colors ${
                    tier.popular
                      ? "bg-sky-600 hover:bg-sky-700 text-white shadow-md"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-md"
                  }`}
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "pricing_click", {
                        event_category: "conversion",
                        event_label: tier.id,
                      });
                    }
                    window.location.href = "/signup";
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
        <h3 className="text-xl font-bold text-slate-900 text-center mb-10">
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {faq.map((item, idx) => (
            <div key={idx} className="premium-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left flex items-center justify-between gap-4 py-3.5 px-5 transition-colors rounded group faq-button"
                aria-expanded={openFaq === idx}
                aria-controls={`faq-answer-${idx}`}
              >
                <span className="font-bold text-slate-900 group-hover:text-slate-900 text-base">{item.question}</span>
                <span className="text-sky-600 group-hover:text-sky-700 text-xl flex-shrink-0 transform transition-transform duration-300 font-bold" style={{ transform: openFaq === idx ? 'rotate(0deg)' : 'rotate(0deg)' }}>
                  {openFaq === idx ? "−" : "+"}
                </span>
              </button>
              <motion.div
                id={`faq-answer-${idx}`}
                initial={false}
                animate={{
                  height: openFaq === idx ? "auto" : 0,
                  opacity: openFaq === idx ? 1 : 0,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-5 pb-4 text-xs text-slate-700 leading-relaxed font-medium">
                  {item.answer}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

