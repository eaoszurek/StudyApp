"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
}

interface FeatureGridProps {
  features: Feature[];
}

export default function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <section id="features" className="relative px-6 md:px-12 lg:px-16 section-spacing">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-slate-600 mb-3 font-semibold">
            Your Expedition Kit
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to reach your peak
          </h2>
          <p className="text-base text-slate-700 leading-relaxed font-medium">
            Five powerful tools designed to guide your climb to SAT success
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-4xl mx-auto">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
            >
              <Link href="/signup" className="block h-full group">
                <div className="premium-card h-full p-5 relative overflow-hidden">
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="text-3xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
                      {feature.description}
                    </p>

                    {/* Link */}
                    <div className="flex items-center gap-2 text-sky-600 group-hover:text-sky-700 transition-colors">
                      <span className="text-sm font-bold">Explore</span>
                      <span className="transform group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </div>

                  {/* Decorative Corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-500/5 to-transparent rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

