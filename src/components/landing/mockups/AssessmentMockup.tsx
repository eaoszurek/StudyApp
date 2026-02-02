"use client";

export default function AssessmentMockup() {
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
      <text x="40" y="35" fill="#F2F9FF" fontSize="20" fontWeight="600">Base Camp Assessment</text>
      <text x="40" y="55" fill="#94A3B8" fontSize="13">Let's find your starting point</text>
      
      {/* Progress Container */}
      <rect x="40" y="90" width="620" height="50" rx="8" fill="rgba(255,255,255,0.05)" />
      <text x="60" y="115" fill="#94A3B8" fontSize="12" fontWeight="500">Question 1 of 6</text>
      <text x="600" y="115" textAnchor="end" fill="#94A3B8" fontSize="12" fontWeight="500">17% complete</text>
      <rect x="60" y="125" width="560" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="60" y="125" width="93" height="8" rx="4" fill="#4A90E2" />
      
      {/* Question */}
      <text x="40" y="170" fill="#F2F9FF" fontSize="22" fontWeight="600">
        What&apos;s your target peak elevation (SAT score)?
      </text>
      <text x="40" y="195" fill="#94A3B8" fontSize="13">Select the score you're aiming for</text>
      
      {/* Options Grid */}
      <rect x="40" y="220" width="300" height="70" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="190" y="260" textAnchor="middle" fill="#E2E8F0" fontSize="24" fontWeight="600">1200</text>
      <text x="190" y="280" textAnchor="middle" fill="#94A3B8" fontSize="12">Good starting point</text>
      
      <rect x="360" y="220" width="300" height="70" rx="12" fill="rgba(74,144,226,0.15)" stroke="#4A90E2" strokeWidth="2" />
      <text x="510" y="260" textAnchor="middle" fill="#93C5FD" fontSize="24" fontWeight="600">1300</text>
      <text x="510" y="280" textAnchor="middle" fill="#4A90E2" fontSize="12" fontWeight="500">Selected</text>
      
      <rect x="40" y="305" width="300" height="70" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="190" y="345" textAnchor="middle" fill="#E2E8F0" fontSize="24" fontWeight="600">1400</text>
      <text x="190" y="365" textAnchor="middle" fill="#94A3B8" fontSize="12">Strong target</text>
      
      <rect x="360" y="305" width="300" height="70" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="510" y="345" textAnchor="middle" fill="#E2E8F0" fontSize="24" fontWeight="600">1500+</text>
      <text x="510" y="365" textAnchor="middle" fill="#94A3B8" fontSize="12">Elite level</text>
      
      {/* Info Badge */}
      <rect x="200" y="375" width="300" height="30" rx="6" fill="rgba(74,144,226,0.1)" />
      <text x="350" y="395" textAnchor="middle" fill="#4A90E2" fontSize="11" fontWeight="500">This helps us personalize your study plan</text>
      
      {/* Navigation Buttons */}
      <rect x="40" y="410" width="120" height="40" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <text x="100" y="433" textAnchor="middle" fill="#94A3B8" fontSize="13" fontWeight="500">← Previous</text>
      
      <rect x="540" y="410" width="120" height="40" rx="8" fill="#4A90E2" />
      <text x="600" y="433" textAnchor="middle" fill="#F2F9FF" fontSize="13" fontWeight="600">Next →</text>
      
    </svg>
  );
}
