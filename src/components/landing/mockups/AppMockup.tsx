"use client";

export default function AppMockup() {
  return (
    <svg
      viewBox="0 0 1200 800"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background - Light mode */}
      <rect width="1200" height="800" fill="#F8FAFC" />
      
      {/* Top Navigation Bar - Glass Panel Style */}
      <rect x="20" y="10" width="1160" height="50" rx="20" fill="rgba(247, 248, 250, 0.98)" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1" />
      <rect x="20" y="10" width="1160" height="50" rx="20" fill="url(#glassGradient)" opacity="0.2" />
      
      {/* Logo in top left */}
      <image x="30" y="20" width="36" height="36" href="/logo.png" />
      
      {/* Nav Items Grid Container - 2 rows x 3 columns */}
      <rect x="85" y="18" width="850" height="34" rx="12" fill="rgba(0, 0, 0, 0.05)" stroke="rgba(0, 0, 0, 0.05)" strokeWidth="1" />
      
      {/* Row 1 - 3 columns - icons as simple shapes */}
      <rect x="92" y="20" width="275" height="14" rx="10" fill="rgba(14, 165, 233, 0.15)" />
      <g transform="translate(98, 22) scale(0.45)"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#0C4A6E" strokeWidth="2" fill="none" /></g>
      <text x="115" y="30" fill="#0C4A6E" fontSize="11" fontWeight="600">Dashboard</text>
      <g transform="translate(378, 22) scale(0.45)"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke="#475569" strokeWidth="2" fill="none" /></g>
      <text x="397" y="30" fill="#475569" fontSize="11">Practice Tests</text>
      <g transform="translate(668, 22) scale(0.45)"><path d="M1 6v16l8-4 8 4V2L9 6 1 2z" stroke="#475569" strokeWidth="2" fill="none" /><path d="M9 2v16M1 6l8 4 8-4" stroke="#475569" strokeWidth="2" fill="none" /></g>
      <text x="687" y="30" fill="#475569" fontSize="11">Study Plans</text>
      <g transform="translate(98, 39) scale(0.45)"><rect x="1" y="1" width="10" height="8" rx="1" stroke="#475569" strokeWidth="2" fill="none" /><rect x="1" y="4" width="10" height="8" rx="1" stroke="#475569" strokeWidth="2" fill="none" /></g>
      <text x="115" y="47" fill="#475569" fontSize="11">Flashcards</text>
      <g transform="translate(378, 39) scale(0.45)"><path d="M2 3h6a2 2 0 012 2v14l-5-3-5 3V5a2 2 0 012-2z" stroke="#475569" strokeWidth="2" fill="none" /><path d="M10 3h6a2 2 0 012 2v14l-5-3" stroke="#475569" strokeWidth="2" fill="none" /></g>
      <text x="397" y="47" fill="#475569" fontSize="11">Micro-Lessons</text>
      <g transform="translate(668, 39) scale(0.45)"><path d="M23 20l-8-12-8 12h16z" stroke="#475569" strokeWidth="2" fill="none" /></g>
      <text x="687" y="47" fill="#475569" fontSize="11">Progress</text>
      <rect x="1020" y="20" width="130" height="30" rx="8" fill="transparent" />
      <g transform="translate(1042, 30) scale(0.5)"><circle cx="12" cy="12" r="3" stroke="#475569" strokeWidth="2" fill="none" /><path d="M12 15v3M12 21v1.5M9 12H7.5M16.5 12H15M10.5 9.5L9 8M15 13l.75-.75M9 15l-.75-.75M15 9.5l.75-.75" stroke="#475569" strokeWidth="1.5" fill="none" /></g>
      <text x="1065" y="40" fill="#475569" fontSize="12" fontWeight="500">Settings</text>
      
      {/* Main Content Container */}
      <rect x="40" y="100" width="1120" height="680" rx="12" fill="transparent" />
      
      {/* Page Header */}
      <text x="60" y="140" fill="#64748B" fontSize="11" fontWeight="600" letterSpacing="0.1em">BASE CAMP</text>
      <text x="60" y="165" fill="#0F172A" fontSize="28" fontWeight="700">Welcome to Peak Prep.</text>
      <text x="60" y="190" fill="#475569" fontSize="14" fontWeight="400">Your expedition headquarters. Plan your route, check your altitude, and prepare for the climb ahead.</text>
      
      {/* Stats Grid - 3 cards */}
      <g>
        {/* Stat Card 1 - Climbing Momentum */}
        <rect x="60" y="220" width="340" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <text x="80" y="245" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">CLIMBING MOMENTUM</text>
        <text x="80" y="280" fill="#0F172A" fontSize="32" fontWeight="700">14</text>
        <text x="80" y="305" fill="#475569" fontSize="13" fontWeight="500">14 days this week</text>
        
        {/* Stat Card 2 - Estimated SAT Score */}
        <rect x="420" y="220" width="340" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <text x="440" y="245" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">ESTIMATED SAT SCORE</text>
        <text x="440" y="280" fill="#0F172A" fontSize="32" fontWeight="700">1280</text>
        <text x="440" y="305" fill="#475569" fontSize="13" fontWeight="500">Top 25% • Good</text>
        
        {/* Stat Card 3 - Total Checkpoints */}
        <rect x="780" y="220" width="340" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <text x="800" y="245" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">TOTAL CHECKPOINTS</text>
        <text x="800" y="280" fill="#0F172A" fontSize="32" fontWeight="700">8</text>
        <text x="800" y="305" fill="#475569" fontSize="13" fontWeight="500">8 practice tests completed</text>
      </g>
      
      {/* Tools Grid - 5 cards in 2 rows */}
      <g>
        {/* Tool Card 1 - Practice Tests */}
        <rect x="60" y="390" width="340" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="80" y="410" width="48" height="48" rx="12" fill="#F1F5F9" />
        <g transform="translate(92, 422) scale(1.2)"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke="#475569" strokeWidth="2" fill="none" /></g>
        <text x="380" y="425" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">GEAR</text>
        <text x="80" y="480" fill="#0F172A" fontSize="20" fontWeight="700">Practice Tests</text>
        <text x="80" y="505" fill="#475569" fontSize="12" fontWeight="500">Practice tests along your trail with instant feedback.</text>
        <text x="80" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">Launch Practice</text>
        <text x="190" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">→</text>
        
        {/* Tool Card 2 - Study Plans */}
        <rect x="420" y="390" width="340" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="440" y="410" width="48" height="48" rx="12" fill="#F1F5F9" />
        <g transform="translate(452, 422) scale(1.2)"><path d="M1 6v16l8-4 8 4V2L9 6 1 2z" stroke="#475569" strokeWidth="2" fill="none" /></g>
        <text x="740" y="425" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">GEAR</text>
        <text x="440" y="480" fill="#0F172A" fontSize="20" fontWeight="700">Study Plans</text>
        <text x="440" y="505" fill="#475569" fontSize="12" fontWeight="500">Personalized expedition plans with milestones.</text>
        <text x="440" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">Launch Study</text>
        <text x="550" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">→</text>
        
        {/* Tool Card 3 - Flashcards */}
        <rect x="780" y="390" width="340" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="800" y="410" width="48" height="48" rx="12" fill="#F1F5F9" />
        <g transform="translate(812, 422) scale(1.2)"><rect x="2" y="2" width="12" height="10" rx="1" stroke="#475569" strokeWidth="2" fill="none" /><rect x="2" y="6" width="12" height="10" rx="1" stroke="#475569" strokeWidth="2" fill="none" /></g>
        <text x="1100" y="425" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">GEAR</text>
        <text x="800" y="480" fill="#0F172A" fontSize="20" fontWeight="700">Flashcards</text>
        <text x="800" y="505" fill="#475569" fontSize="12" fontWeight="500">Essential knowledge packs for your climb.</text>
        <text x="800" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">Launch Flashcards</text>
        <text x="950" y="545" fill="#0EA5E9" fontSize="14" fontWeight="600">→</text>
        
        {/* Tool Card 4 - Micro-Lessons */}
        <rect x="60" y="590" width="340" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="80" y="610" width="48" height="48" rx="12" fill="#F1F5F9" />
        <g transform="translate(92, 622) scale(1.2)"><path d="M2 3h6a2 2 0 012 2v14l-5-3-5 3V5a2 2 0 012-2z" stroke="#475569" strokeWidth="2" fill="none" /><path d="M10 3h6a2 2 0 012 2v14l-5-3" stroke="#475569" strokeWidth="2" fill="none" /></g>
        <text x="380" y="625" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">GEAR</text>
        <text x="80" y="680" fill="#0F172A" fontSize="20" fontWeight="700">Micro-Lessons</text>
        <text x="80" y="705" fill="#475569" fontSize="12" fontWeight="500">Quick 1–2 minute knowledge checkpoints.</text>
        <text x="80" y="745" fill="#0EA5E9" fontSize="14" fontWeight="600">Launch Micro-Lessons</text>
        <text x="230" y="745" fill="#0EA5E9" fontSize="14" fontWeight="600">→</text>
        
        {/* Tool Card 5 - Progress */}
        <rect x="420" y="590" width="340" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="440" y="610" width="48" height="48" rx="12" fill="#F1F5F9" />
        <g transform="translate(452, 622) scale(1.2)"><path d="M12 2L2 22h20L12 2z" stroke="#475569" strokeWidth="2" fill="none" /></g>
        <text x="740" y="625" textAnchor="end" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.1em">GEAR</text>
        <text x="440" y="680" fill="#0F172A" fontSize="20" fontWeight="700">Progress</text>
        <text x="440" y="705" fill="#475569" fontSize="12" fontWeight="500">Monitor your elevation gain and progress.</text>
        <text x="440" y="745" fill="#0EA5E9" fontSize="14" fontWeight="600">Launch Progress</text>
        <text x="550" y="745" fill="#0EA5E9" fontSize="14" fontWeight="600">→</text>
      </g>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E5532" />
          <stop offset="100%" stopColor="#4A90E2" />
        </linearGradient>
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
