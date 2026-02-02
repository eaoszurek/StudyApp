"use client";

/**
 * CSS Placeholder for Climber Animation
 * 
 * Replace this component with lottie-react implementation when ready:
 * 
 * import dynamic from "next/dynamic";
 * import { useState, useEffect } from "react";
 * 
 * const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
 * 
 * Then load your mountain-climber-animation.json and pass to Lottie component
 */

export default function ClimberLoaderPlaceholder() {
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Mountain silhouette */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-32">
          <svg viewBox="0 0 400 120" className="w-full h-full">
            <path
              d="M0,120 L100,40 L200,80 L300,20 L400,60 L400,120 Z"
              fill="rgba(30, 85, 50, 0.3)"
              className="animate-pulse"
            />
          </svg>
        </div>
        
        {/* Climber placeholder */}
        <div className="relative z-10 text-6xl animate-bounce" style={{ animationDuration: '2s' }}>
          ⛰️
        </div>
        
        {/* Progress indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-3/4">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full brand-gradient animate-pulse"
              style={{ width: '65%', animation: 'progress 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes progress {
          0%, 100% { width: 60%; }
          50% { width: 70%; }
        }
      `}</style>
    </div>
  );
}

