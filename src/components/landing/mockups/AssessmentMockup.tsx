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
      <rect width="700" height="450" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      
      {/* Header */}
      <rect x="0" y="0" width="700" height="80" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="40" y="35" fill="#0F172A" fontSize="20" fontWeight="700">Base Camp Assessment</text>
      <text x="40" y="55" fill="#64748B" fontSize="13" fontWeight="500">Let's find your starting point</text>
      
      {/* Progress Container */}
      <rect x="40" y="100" width="620" height="60" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="60" y="125" fill="#64748B" fontSize="11" fontWeight="700" letterSpacing="0.1em">QUESTION 1 OF 6</text>
      <text x="640" y="125" textAnchor="end" fill="#0EA5E9" fontSize="11" fontWeight="700">17%</text>
      <rect x="60" y="138" width="580" height="8" rx="4" fill="#F1F5F9" />
      <rect x="60" y="138" width="98" height="8" rx="4" fill="#0EA5E9" />
      
      {/* Question */}
      <text x="40" y="195" fill="#0F172A" fontSize="24" fontWeight="800">
        What's your target SAT score?
      </text>
      <text x="40" y="220" fill="#475569" fontSize="14" fontWeight="500">Select the peak elevation you're aiming for</text>
      
      {/* Options Grid */}
      <rect x="40" y="245" width="230" height="80" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="155" y="285" textAnchor="middle" fill="#0F172A" fontSize="26" fontWeight="800">1200</text>
      <text x="155" y="305" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="500">Good starting point</text>
      
      <rect x="285" y="245" width="230" height="80" rx="16" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="2" />
      <text x="400" y="285" textAnchor="middle" fill="#0369A1" fontSize="26" fontWeight="800">1400</text>
      <text x="400" y="305" textAnchor="middle" fill="#0EA5E9" fontSize="12" fontWeight="700">Selected</text>
      
      <rect x="530" y="245" width="130" height="80" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="595" y="285" textAnchor="middle" fill="#0F172A" fontSize="26" fontWeight="800">1500+</text>
      <text x="595" y="305" textAnchor="middle" fill="#64748B" fontSize="12" fontWeight="500">Elite</text>
      
      {/* Info Badge */}
      <rect x="200" y="350" width="300" height="34" rx="17" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      <text x="350" y="372" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600">This helps us personalize your study plan</text>
      
      {/* Navigation Buttons */}
      <rect x="40" y="415" width="120" height="40" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="100" y="440" textAnchor="middle" fill="#64748B" fontSize="13" fontWeight="700">Previous</text>
      
      <rect x="540" y="415" width="120" height="40" rx="20" fill="#0EA5E9" />
      <text x="600" y="440" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">Next →</text>
      
    </svg>
  );
}
