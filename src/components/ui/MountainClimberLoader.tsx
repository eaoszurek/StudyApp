"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, memo } from "react";

// Cache animation data at module level to prevent re-fetching
let cachedAnimationData: any = null;
let animationLoadPromise: Promise<any> | null = null;

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { 
  ssr: false
});

interface MountainClimberLoaderProps {
  size?: number;
  className?: string;
}

// Function to load animation data (cached)
const loadAnimationData = async (): Promise<any> => {
  if (cachedAnimationData) {
    return cachedAnimationData;
  }
  
  if (animationLoadPromise) {
    return animationLoadPromise;
  }
  
  animationLoadPromise = (async () => {
    try {
      const response = await fetch("/mountain-climber-animation.json");
      if (response.ok) {
        const data = await response.json();
        cachedAnimationData = data;
        return data;
      }
    } catch (err) {
      console.error("Error fetching animation:", err);
    }
    
    // Fallback: try importing it directly
    try {
      const module = await import("./mountain-climber-animation.json");
      const data = module.default || module;
      cachedAnimationData = data;
      return data;
    } catch (importErr) {
      console.error("Error importing animation:", importErr);
      throw importErr;
    }
  })();
  
  return animationLoadPromise;
};

function MountainClimberLoader({
  size = 200,
  className = "",
}: MountainClimberLoaderProps) {
  const [animationData, setAnimationData] = useState<any>(cachedAnimationData);
  const [isMounted, setIsMounted] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    setIsMounted(true);
    mountedRef.current = true;

    if (!cachedAnimationData) {
      loadAnimationData()
        .then((data) => {
          if (mountedRef.current && data) {
            setAnimationData(data);
          }
        })
        .catch((err) => {
          console.error("Failed to load animation:", err);
        });
    } else if (!animationData) {
      setAnimationData(cachedAnimationData);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [animationData]);

  if (!isMounted || !animationData) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, minHeight: `${size}px` }}
      >
        <div className="text-slate-400 animate-pulse text-4xl">⛰️</div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        position: "relative",
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: "relative"
        }}
      >
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet"
          }}
          style={{ 
            width: "100%", 
            height: "100%",
            display: "block"
          }}
        />
      </div>
    </div>
  );
}

export default memo(MountainClimberLoader);
