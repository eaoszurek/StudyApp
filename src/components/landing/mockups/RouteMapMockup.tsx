"use client";

export default function RouteMapMockup() {
  return (
    <svg
      viewBox="0 0 700 450"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="700" height="450" rx="16" fill="#1E293B" stroke="#3A3F47" strokeWidth="2" />
      
      {/* Header */}
      <rect x="0" y="0" width="700" height="80" fill="#0F172A" />
      <text x="40" y="35" fill="#F2F9FF" fontSize="20" fontWeight="600">Your Expedition Route Map</text>
      <text x="40" y="55" fill="#94A3B8" fontSize="13">Personalized study plan • Updated daily</text>
      
      {/* Schedule Type Badge */}
      <rect x="520" y="30" width="140" height="30" rx="8" fill="rgba(74,144,226,0.1)" stroke="#4A90E2" strokeWidth="1" />
      <text x="590" y="50" textAnchor="middle" fill="#4A90E2" fontSize="11" fontWeight="600" letterSpacing="1">DAILY PLAN</text>
      
      {/* Progress Indicator */}
      <rect x="40" y="90" width="620" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
      <rect x="40" y="90" width="207" height="4" rx="2" fill="#4A90E2" />
      
      {/* Day 1 Card */}
      <rect x="40" y="110" width="620" height="95" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="60" y="140" fill="#F2F9FF" fontSize="16" fontWeight="600">Day 1 • Today</text>
      <circle cx="60" cy="165" r="4" fill="#4A90E2" />
      <text x="80" y="170" fill="#E2E8F0" fontSize="13">Practice Math: Linear Functions (30 min)</text>
      <circle cx="60" cy="185" r="4" fill="#4A90E2" />
      <text x="80" y="190" fill="#E2E8F0" fontSize="13">Review flashcards: Algebra basics</text>
      <rect x="530" y="130" width="100" height="30" rx="6" fill="#4A90E2" />
      <text x="580" y="150" textAnchor="middle" fill="#F2F9FF" fontSize="12" fontWeight="600">Start</text>
      
      {/* Day 2 Card */}
      <rect x="40" y="220" width="620" height="95" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="60" y="250" fill="#F2F9FF" fontSize="16" fontWeight="600">Day 2 • Tomorrow</text>
      <circle cx="60" cy="275" r="4" fill="#1E5532" />
      <text x="80" y="280" fill="#E2E8F0" fontSize="13">Reading checkpoint: Historical passages</text>
      <circle cx="60" cy="295" r="4" fill="#1E5532" />
      <text x="80" y="300" fill="#E2E8F0" fontSize="13">Writing practice: Grammar rules</text>
      <rect x="530" y="240" width="100" height="30" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="580" y="260" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="600">Locked</text>
      
      {/* Day 3 Card */}
      <rect x="40" y="330" width="620" height="95" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="60" y="360" fill="#F2F9FF" fontSize="16" fontWeight="600">Day 3</text>
      <circle cx="60" cy="385" r="4" fill="#64748B" />
      <text x="80" y="390" fill="#64748B" fontSize="13">Mixed checkpoint: All sections (1 hour)</text>
      <circle cx="60" cy="405" r="4" fill="#64748B" />
      <text x="80" y="410" fill="#64748B" fontSize="13">Review weak areas from checkpoint</text>
      <rect x="530" y="350" width="100" height="30" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <text x="580" y="370" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">Locked</text>
      
    </svg>
  );
}
