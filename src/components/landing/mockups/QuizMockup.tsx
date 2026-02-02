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
      <rect width="700" height="450" rx="16" fill="#1E293B" stroke="#3A3F47" strokeWidth="2" />
      
      {/* Header Bar */}
      <rect x="0" y="0" width="700" height="60" fill="#0F172A" />
      
      {/* Progress Bar */}
      <rect x="40" y="20" width="420" height="10" rx="5" fill="rgba(255,255,255,0.1)" />
      <rect x="40" y="20" width="168" height="10" rx="5" fill="#4A90E2" />
      <text x="480" y="30" fill="#94A3B8" fontSize="12" fontWeight="500">Question 3 / 5</text>
      
      {/* Subject Badge */}
      <rect x="600" y="15" width="60" height="20" rx="6" fill="rgba(74,144,226,0.1)" stroke="#4A90E2" strokeWidth="1" />
      <text x="630" y="28" textAnchor="middle" fill="#4A90E2" fontSize="11" fontWeight="600">MATH</text>
      
      {/* Question */}
      <text x="40" y="100" fill="#F2F9FF" fontSize="20" fontWeight="600">
        If 3x + 7 = 22, what is the value of x?
      </text>
      
      {/* Skill Tags */}
      <rect x="40" y="120" width="140" height="28" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="110" y="140" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="500">Linear Equations</text>
      
      <rect x="200" y="120" width="120" height="28" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="260" y="140" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="500">Difficulty: Medium</text>
      
      {/* Options */}
      <rect x="40" y="170" width="600" height="50" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="60" cy="195" r="8" fill="rgba(255,255,255,0.1)" />
      <text x="80" y="200" fill="#E2E8F0" fontSize="14" fontWeight="500">A) x = 3</text>
      
      <rect x="40" y="230" width="600" height="50" rx="12" fill="rgba(74,144,226,0.15)" stroke="#4A90E2" strokeWidth="2" />
      <circle cx="60" cy="255" r="8" fill="#4A90E2" />
      <text x="80" y="260" fill="#93C5FD" fontSize="14" fontWeight="600">B) x = 5</text>
      <text x="550" y="260" textAnchor="end" fill="#4A90E2" fontSize="11" fontWeight="600">Selected</text>
      
      <rect x="40" y="290" width="600" height="50" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="60" cy="315" r="8" fill="rgba(255,255,255,0.1)" />
      <text x="80" y="320" fill="#E2E8F0" fontSize="14" fontWeight="500">C) x = 7</text>
      
      <rect x="40" y="350" width="600" height="50" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="60" cy="375" r="8" fill="rgba(255,255,255,0.1)" />
      <text x="80" y="380" fill="#E2E8F0" fontSize="14" fontWeight="500">D) x = 9</text>
      
      {/* Navigation Buttons */}
      <rect x="40" y="410" width="100" height="30" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="90" y="430" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="500">← Previous</text>
      
      <rect x="560" y="410" width="100" height="30" rx="8" fill="#4A90E2" />
      <text x="610" y="430" textAnchor="middle" fill="#F2F9FF" fontSize="12" fontWeight="600">Next →</text>
      
    </svg>
  );
}
