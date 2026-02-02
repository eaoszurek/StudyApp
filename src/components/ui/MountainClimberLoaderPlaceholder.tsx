"use client";

import { useEffect } from "react";

interface MountainClimberLoaderPlaceholderProps {
  size?: number;
  className?: string;
}

export default function MountainClimberLoaderPlaceholder({
  size = 200,
  className = "",
}: MountainClimberLoaderPlaceholderProps) {
  useEffect(() => {
    const styleId = "mountain-climber-animations";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes mountain-walk-cycle {
        0% {
          transform: translateY(0) rotate(-2deg);
        }
        25% {
          transform: translateY(-5px) rotate(2deg);
        }
        50% {
          transform: translateY(-10px) rotate(-2deg);
        }
        75% {
          transform: translateY(-5px) rotate(2deg);
        }
        100% {
          transform: translateY(0) rotate(-2deg);
        }
      }

      @keyframes mountain-left-leg {
        0% {
          transform: translateX(-50%) translateX(-12px) translateY(0) rotate(25deg);
        }
        25% {
          transform: translateX(-50%) translateX(-12px) translateY(-8px) rotate(-25deg);
        }
        50% {
          transform: translateX(-50%) translateX(-12px) translateY(0) rotate(25deg);
        }
        75% {
          transform: translateX(-50%) translateX(-12px) translateY(-8px) rotate(-25deg);
        }
        100% {
          transform: translateX(-50%) translateX(-12px) translateY(0) rotate(25deg);
        }
      }

      @keyframes mountain-right-leg {
        0% {
          transform: translateX(-50%) translateX(12px) translateY(-8px) rotate(-25deg);
        }
        25% {
          transform: translateX(-50%) translateX(12px) translateY(0) rotate(25deg);
        }
        50% {
          transform: translateX(-50%) translateX(12px) translateY(-8px) rotate(-25deg);
        }
        75% {
          transform: translateX(-50%) translateX(12px) translateY(0) rotate(25deg);
        }
        100% {
          transform: translateX(-50%) translateX(12px) translateY(-8px) rotate(-25deg);
        }
      }

      @keyframes mountain-backpack-bounce {
        0% {
          transform: translateX(-50%) translateY(0);
        }
        25% {
          transform: translateX(-50%) translateY(3px);
        }
        50% {
          transform: translateX(-50%) translateY(0);
        }
        75% {
          transform: translateX(-50%) translateY(3px);
        }
        100% {
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "10%",
            width: "80%",
            height: "12%",
            background: "var(--trail-tan)",
            borderRadius: "999px",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "relative",
            width: "40%",
            height: "60%",
            animation: "mountain-walk-cycle 1.2s ease-in-out infinite",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "20px",
              height: "20px",
              background: "var(--forest-green)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "24px",
              height: "32px",
              background: "var(--forest-green)",
              borderRadius: "8px",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "22px",
              left: "50%",
              width: "18px",
              height: "22px",
              background: "var(--sky-blue)",
              borderRadius: "6px",
              animation: "mountain-backpack-bounce 1.2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "8px",
              height: "24px",
              background: "var(--forest-green)",
              borderRadius: "4px",
              top: "48px",
              left: "50%",
              animation: "mountain-left-leg 1.2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "8px",
              height: "24px",
              background: "var(--forest-green)",
              borderRadius: "4px",
              top: "48px",
              left: "50%",
              animation: "mountain-right-leg 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

