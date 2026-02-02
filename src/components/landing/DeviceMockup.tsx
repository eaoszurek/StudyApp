"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface DeviceMockupProps {
  children?: ReactNode;
  type?: "phone" | "desktop";
  className?: string;
}

export default function DeviceMockup({
  children,
  type = "desktop",
  className = "",
}: DeviceMockupProps) {
  if (type === "phone") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`relative ${className}`}
      >
        {/* Phone Frame */}
        <div className="relative w-[280px] mx-auto">
          {/* Phone Shadow */}
          <div className="absolute inset-0 bg-black/20 rounded-[3rem] blur-2xl transform translate-y-8 scale-95" />
          
          {/* Phone Body */}
          <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] p-2 shadow-deep">
            {/* Screen Bezel */}
            <div className="bg-black rounded-[2.5rem] p-1">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
              
              {/* Screen */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.25rem] overflow-hidden min-h-[560px] relative">
                {children || (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">⛰️</div>
                      <p className="text-slate-400 text-sm">App Preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop mockup
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={`relative ${className}`}
    >
      {/* Desktop Shadow */}
      <div className="absolute inset-0 bg-black/30 rounded-2xl blur-3xl transform translate-y-12 scale-90" />
      
      {/* Desktop Frame */}
      <div className="relative bg-gradient-to-b from-slate-700 to-slate-900 rounded-2xl p-3 shadow-deep transform-gpu">
        {/* Screen Bezel */}
        <div className="bg-black rounded-xl p-1">
          {/* Camera */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-1.5 bg-black rounded-full z-10" />
          
          {/* Screen */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden relative aspect-video min-h-[400px]">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-green-500/10 pointer-events-none" />
            
            {children || (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-8xl mb-6">⛰️</div>
                  <p className="text-slate-400">App Preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Stand */}
        <div className="mt-2 flex justify-center">
          <div className="w-32 h-8 bg-gradient-to-b from-slate-600 to-slate-800 rounded-b-lg" />
        </div>
      </div>
    </motion.div>
  );
}

