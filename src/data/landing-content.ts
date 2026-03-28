export const landingContent = {
  hero: {
    variantA: {
      headline: "Climb to Your Highest SAT Score, One Step at a Time",
      subhead: "The companion for students who want a clear trail ahead. No more feeling lost—just a daily route map to your peak performance.",
      ctaPrimary: "Begin your ascent",
      ctaSecondary: "View the trail map",
    },
    variantB: {
      headline: "SAT Prep That Doesn’t Overwhelm You.",
      subhead: "Bite-sized study sessions designed to keep your momentum high and your stress low. The summit is closer than you think.",
      ctaPrimary: "Begin your ascent",
      ctaSecondary: "View the trail map",
    },
  },
  features: [
    { id: "route-maps", icon: "study-plan", title: "Personalized Route Maps", description: "Smart study plans that adapt to your pace, target elevation, and timeline.", link: "/study-plan" },
    { id: "tools-supplies", icon: "flashcards", title: "Tools & Supplies", description: "Essential knowledge packs with SAT-accurate content to gear up for every concept.", link: "/flashcards" },
    { id: "checkpoints", icon: "practice", title: "Trail Checkpoints", description: "Full-length practice tests with instant altitude checks and expert guidance.", link: "/practice" },
    { id: "micro-lessons", icon: "lessons", title: "Micro-Lessons", description: "Quick 2-minute knowledge bursts to help you master tricky waypoints on the fly.", link: "/lessons" },
    { id: "backtrack", icon: "progress", title: "Progress Tracker", description: "Monitor your elevation gain and see exactly how far you've climbed.", link: "/progress" },
  ],
  pricing: {
    tiers: [
      {
        id: "free",
        name: "Base Camp",
        price: "$0",
        period: "forever",
        features: [
          "1 free practice checkpoint",
          "1 free Route Map study plan",
          "1 free flashcard pack",
          "1 free micro-lesson",
          "Progress tracking",
          "Anonymous session support",
        ],
        cta: "Start Free",
        popular: false,
      },
      {
        id: "pro",
        name: "Peak",
        price: "$5",
        period: "month",
        features: [
          "Unlimited practice checkpoints",
          "Advanced Route Map customization",
          "Unlimited flashcards",
          "Unlimited micro-lessons",
          "Detailed analytics & insights",
          "Priority AI generation",
        ],
        cta: "Start Free Trial",
        popular: true,
      },
    ],
    faq: [
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.",
      },
      {
        question: "Do you offer refunds?",
        answer: "Except where required by law, payments are non-refundable. You can cancel at any time, and you'll retain access until the end of your current billing period.",
      },
      {
        question: "What's the difference between Free and Paid?",
        answer: "Free includes basic features with limits. The paid plan removes all limits, adds advanced analytics, and provides priority AI generation for faster response times.",
      },
    ],
  },
  testimonials: [],
  trustBar: {
    text: "Built by a student, for students.",
  },
  seo: {
    title: "PeakPrep — Mountain-themed SAT prep app",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
    ogImage: "/images/og-peakprep.png",
  },
};

