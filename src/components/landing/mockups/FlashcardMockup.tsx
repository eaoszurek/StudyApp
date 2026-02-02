"use client";

export default function FlashcardMockup() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card Background */}
      <rect width="400" height="300" rx="16" fill="#1E293B" stroke="#3A3F47" strokeWidth="2" />
      
      {/* Card Shadow */}
      <rect x="8" y="8" width="400" height="300" rx="16" fill="#000" opacity="0.2" />
      
      {/* Front Side */}
      <rect x="20" y="20" width="360" height="260" rx="12" fill="#0F172A" />
      
      {/* Question */}
      <rect x="40" y="40" width="320" height="20" rx="4" fill="#4A90E2" opacity="0.3" />
      <rect x="40" y="70" width="280" height="12" rx="2" fill="#E2E8F0" />
      <rect x="40" y="90" width="240" height="12" rx="2" fill="#94A3B8" />
      
      {/* Flip Indicator */}
      <circle cx="360" cy="50" r="8" fill="#4A90E2" opacity="0.5" />
      <text x="360" y="55" textAnchor="middle" fill="#F2F9FF" fontSize="10">↻</text>
      
      {/* Difficulty Badge */}
      <rect x="40" y="130" width="80" height="24" rx="12" fill="#1E5532" opacity="0.3" />
      <text x="80" y="147" textAnchor="middle" fill="#86EFAC" fontSize="12" fontWeight="600">Medium</text>
      
      {/* Progress Dots */}
      <circle cx="50" cy="250" r="4" fill="#4A90E2" />
      <circle cx="70" cy="250" r="4" fill="#4A90E2" />
      <circle cx="90" cy="250" r="4" fill="#64748B" />
      <circle cx="110" cy="250" r="4" fill="#64748B" />
      
      {/* Mountain Icon */}
      <path
        d="M320 200 L340 160 L360 180 L380 140 L400 160 L400 200 Z"
        fill="#1E5532"
        opacity="0.2"
      />
    </svg>
  );
}

