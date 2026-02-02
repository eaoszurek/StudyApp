"use client";

import { motion } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";

interface TestimonialProps {
  name: string;
  scoreImprovement: string;
  quote: string;
  avatar?: string;
  delay?: number;
}

export default function Testimonial({
  name,
  scoreImprovement,
  quote,
  avatar,
  delay = 0,
}: TestimonialProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <GlassPanel delay={delay} className="h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-start gap-4 mb-4">
            {avatar ? (
              <img
                src={avatar}
                alt={`${name}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-slate-900 font-semibold">
                {name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{name}</h4>
              <p className="text-sm text-sky-600 font-semibold">{scoreImprovement}</p>
            </div>
          </div>
          <p className="text-slate-700 leading-relaxed flex-1 font-medium">&ldquo;{quote}&rdquo;</p>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

