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
      <rect width="700" height="450" rx="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      
      {/* Header Bar */}
      <rect x="0" y="0" width="700" height="65" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="40" y="40" fill="#0F172A" fontSize="18" fontWeight="800">Your Progress Hub</text>
      
      {/* Mini Stats Grid */}
      <rect x="30" y="85" width="200" height="80" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="45" y="115" fill="#64748B" fontSize="11" fontWeight="700">CURRENT CAMP</text>
      <text x="45" y="145" fill="#0F172A" fontSize="18" fontWeight="800">Base Camp 4</text>
      
      <rect x="250" y="85" width="200" height="80" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="265" y="115" fill="#64748B" fontSize="11" fontWeight="700">ALTITUDE</text>
      <text x="265" y="145" fill="#0EA5E9" fontSize="18" fontWeight="800">1420 / 1600</text>
      
      <rect x="470" y="85" width="200" height="80" rx="16" fill="#F0FDF4" stroke="#DCFCE7" strokeWidth="1" />
      <text x="485" y="115" fill="#15803D" fontSize="11" fontWeight="700">ELEVATION GAINED</text>
      <text x="485" y="145" fill="#16A34A" fontSize="18" fontWeight="800">+120 Points</text>
      
      {/* Altitude Trend Chart (Simplified) */}
      <rect x="30" y="185" width="640" height="230" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="50" y="215" fill="#0F172A" fontSize="14" fontWeight="800">Altitude Trend</text>
      
      {/* Grid Lines */}
      <line x1="50" y1="235" x2="650" y2="235" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="50" y1="275" x2="650" y2="275" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="50" y1="315" x2="650" y2="315" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="50" y1="355" x2="650" y2="355" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
      
      {/* Trend Line (Smooth Path) */}
      <path
        d="M60,360 L180,330 L300,345 L420,280 L540,260 L640,220"
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Gradient Area under curve */}
      <path
        d="M60,360 L180,330 L300,345 L420,280 L540,260 L640,220 V415 H60 Z"
        fill="url(#chartGradient)"
        opacity="0.1"
      />
      
      {/* Target Score Line */}
      <line x1="50" y1="240" x2="650" y2="240" stroke="#10B981" strokeWidth="2" strokeDasharray="6 4" />
      <text x="50" y="234" textAnchor="start" fill="#10B981" fontSize="10" fontWeight="700">TARGET: 1500</text>
      
      {/* Data Points */}
      <circle cx="60" cy="360" r="5" fill="#0EA5E9" stroke="white" strokeWidth="2" />
      <circle cx="180" cy="330" r="5" fill="#0EA5E9" stroke="white" strokeWidth="2" />
      <circle cx="300" cy="345" r="5" fill="#0EA5E9" stroke="white" strokeWidth="2" />
      <circle cx="420" cy="280" r="5" fill="#0EA5E9" stroke="white" strokeWidth="2" />
      <circle cx="540" cy="260" r="5" fill="#0EA5E9" stroke="white" strokeWidth="2" />
      <circle cx="640" cy="220" r="7" fill="#10B981" stroke="white" strokeWidth="3" />
      
      {/* Peak Badge */}
      <rect x="580" y="195" width="80" height="20" rx="10" fill="#F0FDF4" />
      <text x="620" y="209" textAnchor="middle" fill="#15803D" fontSize="10" fontWeight="800">PEAK GAIN</text>
      
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );
}
