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
      <rect width="500" height="350" rx="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      
      {/* Header Bar */}
      <rect x="0" y="0" width="500" height="70" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="25" y="15" width="80" height="16" rx="8" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1" />
      <text x="65" y="26" textAnchor="middle" fill="#0369A1" fontSize="8" fontWeight="700">MICRO-LESSON</text>
      <text x="25" y="52" fill="#0F172A" fontSize="18" fontWeight="800">Quadratic Equations</text>
      
      {/* Content Blocks (Glass Effect) */}
      <rect x="25" y="90" width="450" height="40" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="40" y="102" width="12" height="12" rx="3" fill="#0EA5E9" />
      <rect x="60" y="105" width="300" height="6" rx="3" fill="#64748B" opacity="0.4" />
      
      <rect x="25" y="145" width="450" height="80" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="40" y="160" width="4" height="40" rx="2" fill="#10B981" />
      <rect x="55" y="165" width="400" height="6" rx="3" fill="#64748B" opacity="0.3" />
      <rect x="55" y="180" width="360" height="6" rx="3" fill="#64748B" opacity="0.3" />
      <rect x="55" y="195" width="380" height="6" rx="3" fill="#64748B" opacity="0.3" />
      
      {/* Interactive Checkpoint */}
      <rect x="25" y="240" width="450" height="85" rx="12" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1" />
      <text x="40" y="262" fill="#0369A1" fontSize="12" fontWeight="800">Checkpoint 1</text>
      
      <rect x="40" y="280" width="420" height="32" rx="16" fill="white" stroke="#0EA5E9" strokeWidth="1.5" />
      <circle cx="56" cy="296" r="8" fill="#0EA5E9" />
      <text x="56" y="300" textAnchor="middle" fill="white" fontSize="10" fontWeight="800">A</text>
      <text x="75" y="300" fill="#0F172A" fontSize="12" fontWeight="600">Standard Form: y = ax² + bx + c</text>
    </svg>
  );
}
