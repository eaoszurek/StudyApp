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
      
      {/* Top Header/PageHeader Mockup */}
      <text x="60" y="80" fill="#64748B" fontSize="10" fontWeight="600" letterSpacing="0.4em">BASE CAMP</text>
      <text x="60" y="115" fill="#0F172A" fontSize="32" fontWeight="700">Welcome to Peak Prep.</text>
      <text x="60" y="145" fill="#475569" fontSize="14" fontWeight="500">Your expedition headquarters. Plan your route, check your altitude.</text>
      
      {/* GlassPanel Encouragement Banner */}
      <rect x="60" y="170" width="1080" height="40" rx="12" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <text x="80" y="195" fill="#334155" fontSize="12" fontWeight="600">Welcome aboard. Start with a Practice Test to set your baseline.</text>

      {/* Stats Grid - 3 cards (Matches Dashboard stats) */}
      <g>
        {/* Stat Card 1 - Climbing Momentum */}
        <rect x="60" y="230" width="340" height="120" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="60" y="230" width="340" height="120" rx="16" fill="url(#glassGradient)" opacity="0.05" />
        <text x="80" y="255" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.3em">CLIMBING MOMENTUM</text>
        <text x="80" y="295" fill="#0F172A" fontSize="32" fontWeight="800">14</text>
        <text x="80" y="325" fill="#475569" fontSize="12" fontWeight="500">14 days active this week</text>
        
        {/* Stat Card 2 - Estimated SAT Score */}
        <rect x="430" y="230" width="340" height="120" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="430" y="230" width="340" height="120" rx="16" fill="url(#glassGradient)" opacity="0.05" />
        <text x="450" y="255" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.3em">ESTIMATED SAT SCORE</text>
        <text x="450" y="295" fill="#0F172A" fontSize="32" fontWeight="800">1280</text>
        <text x="450" y="325" fill="#475569" fontSize="12" fontWeight="500">Top 25% • Good</text>
        
        {/* Stat Card 3 - Total Checkpoints */}
        <rect x="800" y="230" width="340" height="120" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="800" y="230" width="340" height="120" rx="16" fill="url(#glassGradient)" opacity="0.05" />
        <text x="820" y="255" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.3em">TOTAL CHECKPOINTS</text>
        <text x="820" y="295" fill="#0F172A" fontSize="32" fontWeight="800">8</text>
        <text x="820" y="325" fill="#475569" fontSize="12" fontWeight="500">8 practice tests completed</text>
      </g>
      
      {/* Tools Grid - 3 cards (Matches Dashboard tools) */}
      <g>
        {/* Tool Card 1 - Practice Tests */}
        <rect x="60" y="380" width="340" height="200" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="80" y="400" width="48" height="48" rx="14" fill="#F0F9FF" />
        <g transform="translate(92, 412) scale(1.2)"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke="#0EA5E9" strokeWidth="2" fill="none" /></g>
        <text x="380" y="415" textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="700" letterSpacing="0.3em">GEAR</text>
        <text x="80" y="480" fill="#0F172A" fontSize="22" fontWeight="800">Practice Tests</text>
        <text x="80" y="505" fill="#475569" fontSize="13" fontWeight="500">Practice tests with instant feedback.</text>
        <text x="80" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">Launch Practice</text>
        <text x="210" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">→</text>
        
        {/* Tool Card 2 - Study Plans */}
        <rect x="430" y="380" width="340" height="200" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="450" y="400" width="48" height="48" rx="14" fill="#F0F9FF" />
        <g transform="translate(462, 412) scale(1.2)"><path d="M1 6v16l8-4 8 4V2L9 6 1 2z" stroke="#0EA5E9" strokeWidth="2" fill="none" /></g>
        <text x="750" y="415" textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="700" letterSpacing="0.3em">GEAR</text>
        <text x="450" y="480" fill="#0F172A" fontSize="22" fontWeight="800">Study Plans</text>
        <text x="450" y="505" fill="#475569" fontSize="13" fontWeight="500">Personalized expedition plans.</text>
        <text x="450" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">Launch Study</text>
        <text x="560" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">→</text>
        
        {/* Tool Card 3 - Flashcards */}
        <rect x="800" y="380" width="340" height="200" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="820" y="400" width="48" height="48" rx="14" fill="#F0F9FF" />
        <g transform="translate(832, 412) scale(1.2)"><rect x="2" y="2" width="12" height="10" rx="1" stroke="#0EA5E9" strokeWidth="2" fill="none" /><rect x="2" y="6" width="12" height="10" rx="1" stroke="#0EA5E9" strokeWidth="2" fill="none" /></g>
        <text x="1120" y="415" textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="700" letterSpacing="0.3em">GEAR</text>
        <text x="820" y="480" fill="#0F172A" fontSize="22" fontWeight="800">Flashcards</text>
        <text x="820" y="505" fill="#475569" fontSize="13" fontWeight="500">Essential knowledge packs.</text>
        <text x="820" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">Launch Flashcards</text>
        <text x="960" y="555" fill="#0EA5E9" fontSize="14" fontWeight="700">→</text>
      </g>

      {/* Today's Tasks Mockup */}
      <g>
        <rect x="60" y="600" width="1080" height="160" rx="20" fill="rgba(255, 255, 255, 0.4)" stroke="#E2E8F0" strokeWidth="1" />
        <text x="85" y="635" fill="#0F172A" fontSize="18" fontWeight="700">Today's Study Tasks</text>
        <text x="85" y="655" fill="#64748B" fontSize="11" fontWeight="500">Pulled from your active study plan</text>
        
        {/* Task Item */}
        <rect x="85" y="675" width="1030" height="65" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1" />
        <text x="105" y="695" fill="#0EA5E9" fontSize="10" fontWeight="700" letterSpacing="0.2em">PRACTICE TEST</text>
        <text x="105" y="718" fill="#0F172A" fontSize="15" fontWeight="700">Linear Functions & Equations</text>
        <rect x="1010" y="690" width="80" height="34" rx="17" fill="#0EA5E9" />
        <text x="1050" y="712" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Start</text>
      </g>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="100%" stopColor="white" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
