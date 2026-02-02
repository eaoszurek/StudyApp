"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Logo({ 
  className = "", 
  showText = true, 
  size = "md",
  href = "/",
  onClick
}: LogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Immediate check
    const check = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };
    
    check();
    
    // Observer for changes
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    
    return () => observer.disconnect();
  }, []);

  const sizeClasses = {
    sm: {
      image: "h-7 w-auto",
      container: "p-1",
      gap: "gap-1.5"
    },
    md: {
      image: "h-10 w-auto",
      container: "p-1",
      gap: "gap-2",
      text: "text-xl"
    },
    lg: {
      image: "h-12 w-auto",
      container: "p-0.5",
      gap: "gap-3",
      text: "text-2xl"
    }
  };

  const currentSize = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center ${currentSize.gap} ${currentSize.container} ${className}`}>
        <img
        src={isDark ? "/logo1.png" : "/logo.png"}
          alt="Peak Prep Logo"
          className={`${currentSize.image} flex-shrink-0 object-contain`}
        key={isDark ? "dark-logo" : "light-logo"}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
          // Fallback logic
          if (isDark && target.src.includes("logo1.png")) {
            target.src = "/logo.png";
          } else {
            target.style.display = 'none';
          }
          }}
        />
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-block focus:outline-none rounded-lg transition-all">
        {logoContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className="inline-block cursor-pointer focus:outline-none rounded-lg transition-all">
      {logoContent}
    </div>
  );
}

