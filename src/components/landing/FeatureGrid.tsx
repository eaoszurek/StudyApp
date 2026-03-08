"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import FeatureIcon from "@/components/ui/FeatureIcon";
import type { FeatureIconName } from "@/components/ui/FeatureIcon";

interface Feature {
  id: string;
  icon: FeatureIconName;
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
                <div className="premium-card feature-card-simple-hover h-full p-5 relative overflow-hidden transition-[background-color] duration-200 group-hover:bg-slate-100">
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="text-slate-600 mb-4">
                      <FeatureIcon name={feature.icon} size={32} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
                      {feature.description}
                    </p>

                    {/* Link */}
                    <div className="flex items-center gap-2 text-sky-600">
                      <span className="text-sm font-bold">Explore</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

