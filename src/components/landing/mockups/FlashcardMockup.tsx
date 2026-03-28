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
      <rect width="400" height="300" rx="24" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      
      {/* Card Header (Matches Flashcards Page) */}
      <rect x="20" y="20" width="100" height="20" rx="10" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1" />
      <text x="70" y="34" textAnchor="middle" fill="#0369A1" fontSize="10" fontWeight="700">ALGEBRA</text>

      <rect x="130" y="20" width="60" height="20" rx="10" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="1" />
      <text x="160" y="34" textAnchor="middle" fill="#92400E" fontSize="10" fontWeight="700">Hard</text>
      
      {/* Content Area */}
      <text x="200" y="140" textAnchor="middle" fill="#0F172A" fontSize="20" fontWeight="800">What is the formula for</text>
      <text x="200" y="170" textAnchor="middle" fill="#0F172A" fontSize="20" fontWeight="800">exponential growth?</text>
      
      {/* Progress Dots */}
      <g transform="translate(160, 240)">
        <circle cx="0" cy="0" r="4" fill="#0EA5E9" />
        <circle cx="20" cy="0" r="4" fill="#0EA5E9" />
        <circle cx="40" cy="0" r="4" fill="#0EA5E9" />
        <circle cx="60" cy="0" r="4" fill="#E2E8F0" />
        <circle cx="80" cy="0" r="4" fill="#E2E8F0" />
      </g>
      
      {/* Flip Instruction */}
      <text x="200" y="280" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="500">Tap to see answer</text>
    </svg>
  );
}

