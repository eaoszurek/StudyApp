export const landingContent = {
  hero: {
    variantA: {
      headline: "Climb to Your Highest SAT Score One Step at a Time",
      subhead: "Peak Prep is an AI-powered SAT coach designed for students who feel overwhelmed and want a clear, daily path forward.",
      ctaPrimary: "Start your climb",
      ctaSecondary: "See how it works",
    },
    variantB: {
      headline: "SAT Prep That Doesn’t Overwhelm You.",
      subhead: "Short, guided study sessions that help you stay consistent and keep moving forward.",
      ctaPrimary: "Start your climb",
      ctaSecondary: "See how it works",
    },
  },
  features: [
    {
      id: "route-maps",
      icon: "🗺️",
      title: "Personalized Route Maps",
      description: "AI-generated study plans that adapt to your pace, target score, and timeline.",
      link: "/study-plan",
    },
    {
      id: "tools-supplies",
      icon: "🎒",
      title: "Tools & Supplies",
      description: "Spaced repetition flashcards with SAT-accurate content for every concept.",
      link: "/flashcards",
    },
    {
      id: "checkpoints",
      icon: "🚩",
      title: "Trail Checkpoints",
      description: "Timed practice tests with instant feedback and detailed explanations.",
      link: "/practice",
    },
    {
      id: "micro-lessons",
      icon: "📚",
      title: "Micro-Lessons",
      description: "Quick 1–2 minute knowledge checkpoints with examples and practice questions.",
      link: "/lessons",
    },
    {
      id: "backtrack",
      icon: "📊",
      title: "Progress",
      description: "Review analytics and track your elevation gain across all trails.",
      link: "/progress",
    },
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

