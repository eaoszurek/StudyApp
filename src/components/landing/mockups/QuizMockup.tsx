"use client";

export default function QuizMockup() {
  return (
    <svg
      viewBox="0 0 700 450"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="700" height="450" rx="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      
      {/* Header Bar */}
      <rect x="0" y="0" width="700" height="65" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="40" y="40" fill="#0F172A" fontSize="16" fontWeight="800">Daily Trek: Math</text>
      
      <rect x="580" y="22" width="80" height="24" rx="12" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1" />
      <text x="620" y="38" textAnchor="middle" fill="#0369A1" fontSize="11" fontWeight="700">6/12</text>
      
      {/* Question Card */}
      <rect x="30" y="85" width="640" height="280" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="0.5" />
      
      <text x="50" y="125" fill="#64748B" fontSize="12" fontWeight="700">QUESTION 6</text>
      <text x="50" y="155" fill="#0F172A" fontSize="22" fontWeight="800">
        If 4k + 7 = 31, what is the value of 8k - 2?
      </text>
      
      {/* Options */}
      <g transform="translate(50, 185)">
        <rect x="0" y="0" width="600" height="46" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="23" cy="23" r="9" fill="#F1F5F9" />
        <text x="23" y="27" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="800">A</text>
        <text x="45" y="27" fill="#475569" fontSize="14" fontWeight="600">42</text>
        
        <rect x="0" y="58" width="600" height="46" rx="12" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1.5" />
        <circle cx="23" cy="81" r="9" fill="#0EA5E9" />
        <text x="23" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="800">B</text>
        <text x="45" y="85" fill="#0369A1" fontSize="14" fontWeight="700">46</text>
        
        <rect x="0" y="116" width="600" height="46" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="23" cy="139" r="9" fill="#F1F5F9" />
        <text x="23" y="143" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="800">C</text>
        <text x="45" y="143" fill="#475569" fontSize="14" fontWeight="600">54</text>
      </g>
      
      {/* Explanation Peek */}
      <rect x="30" y="380" width="640" height="40" rx="12" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
      <text x="50" y="405" fill="#15803D" fontSize="12" fontWeight="800">✓ Correct! Quadratic foundations are climbing.</text>
      
      {/* Footer Nav */}
      <rect x="0" y="400" width="700" height="50" fill="white" stroke="#E2E8F0" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
