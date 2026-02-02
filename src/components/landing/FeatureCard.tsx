"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlassPanel from "@/components/ui/GlassPanel";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  link: string;
  delay?: number;
}

export default function FeatureCard({
  icon,
  title,
  description,
  link,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <Link href={link} className="block h-full">
        <GlassPanel delay={delay} className="h-full">
          <div className="flex flex-col h-full">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-sm text-slate-700 leading-relaxed flex-1 font-medium">
              {description}
            </p>
            <span className="mt-4 text-xs uppercase tracking-[0.3em] text-sky-600 flex items-center gap-2 font-semibold">
              Explore <span aria-hidden="true">→</span>
            </span>
          </div>
        </GlassPanel>
      </Link>
    </motion.div>
  );
}

