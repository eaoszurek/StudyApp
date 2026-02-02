"use client";

export default function LessonMockup() {
  return (
    <svg
      viewBox="0 0 500 350"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="500" height="350" rx="16" fill="#1E293B" stroke="#3A3F47" strokeWidth="2" />
      
      {/* Header */}
      <rect x="20" y="20" width="460" height="50" rx="8" fill="#0F172A" />
      <text x="40" y="45" fill="#94A3B8" fontSize="10" fontWeight="600">MICRO-LESSON</text>
      <text x="40" y="62" fill="#F2F9FF" fontSize="18" fontWeight="600">Quadratic Equations</text>
      
      {/* Goal Section */}
      <rect x="20" y="80" width="460" height="40" rx="8" fill="#0F172A" />
      <text x="35" y="100" fill="#94A3B8" fontSize="9" fontWeight="600">Learning Goal</text>
      <rect x="35" y="105" width="300" height="8" rx="2" fill="#4A90E2" opacity="0.5" />
      <rect x="35" y="115" width="250" height="6" rx="2" fill="#64748B" />
      
      {/* Explanation Section */}
      <rect x="20" y="130" width="460" height="80" rx="8" fill="#0F172A" />
      <text x="35" y="150" fill="#94A3B8" fontSize="9" fontWeight="600">Explanation</text>
      <circle cx="40" cy="165" r="3" fill="#4A90E2" />
      <rect x="50" y="160" width="200" height="6" rx="2" fill="#E2E8F0" />
      <circle cx="40" cy="180" r="3" fill="#4A90E2" />
      <rect x="50" y="175" width="180" height="6" rx="2" fill="#94A3B8" />
      <circle cx="40" cy="195" r="3" fill="#4A90E2" />
      <rect x="50" y="190" width="220" height="6" rx="2" fill="#64748B" />
      
      {/* Example Box */}
      <rect x="20" y="220" width="460" height="50" rx="8" fill="#1E5532" opacity="0.2" stroke="#1E5532" strokeWidth="1" />
      <text x="35" y="240" fill="#86EFAC" fontSize="9" fontWeight="600">Example</text>
      <rect x="35" y="245" width="350" height="8" rx="2" fill="#86EFAC" opacity="0.7" />
      <rect x="35" y="255" width="280" height="6" rx="2" fill="#86EFAC" opacity="0.5" />
      
      {/* Practice Question */}
      <rect x="20" y="280" width="460" height="60" rx="8" fill="#0F172A" />
      <text x="35" y="300" fill="#94A3B8" fontSize="9" fontWeight="600">Practice Question</text>
      <rect x="35" y="305" width="280" height="6" rx="2" fill="#E2E8F0" />
      <rect x="35" y="315" width="320" height="20" rx="4" fill="#4A90E2" opacity="0.1" stroke="#4A90E2" strokeWidth="1" />
      <text x="45" y="328" fill="#93C5FD" fontSize="11" fontWeight="600">A) Option 1</text>
      
      {/* Mountain Decoration */}
      <path
        d="M380 280 L410 240 L440 260 L470 220 L500 240 L500 280 Z"
        fill="#1E5532"
        opacity="0.15"
      />
    </svg>
  );
}

