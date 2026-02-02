export const landingContent = {
  hero: {
    variantA: {
      headline: "Climb To Your Highest SAT Score, One Step At A Time.",
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
          "5 practice checkpoints per month",
          "Basic Route Map generator",
          "50 flashcards per pack",
          "10 micro-lessons per month",
          "Progress tracking",
        ],
        cta: "Start Free",
        popular: false,
      },
      {
        id: "pro",
        name: "Peak",
        price: "$12",
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
        answer: "We offer a 14-day money-back guarantee. If you're not satisfied, contact us within 14 days for a full refund.",
      },
      {
        question: "What's the difference between Free and Paid?",
        answer: "Free includes basic features with limits. The paid plan removes all limits, adds advanced analytics, and provides priority AI generation for faster response times.",
      },
    ],
  },
  testimonials: [
    {
      name: "Sarah Chen",
      scoreImprovement: "+180 points",
      quote: "PeakPrep's Route Maps helped me stay organized and focused. I went from 1200 to 1380 in 3 months.",
      avatar: "/images/testimonial-sarah.jpg",
    },
    {
      name: "Marcus Johnson",
      scoreImprovement: "+210 points",
      quote: "The checkpoint practice tests were game-changers. The instant feedback helped me understand my mistakes immediately.",
      avatar: "/images/testimonial-marcus.jpg",
    },
    {
      name: "Emma Rodriguez",
      scoreImprovement: "+195 points",
      quote: "I loved the mountain theme—it made studying feel like an adventure instead of a chore. Reached my target score!",
      avatar: "/images/testimonial-emma.jpg",
    },
    {
      name: "Alex Kim",
      scoreImprovement: "+225 points",
      quote: "The flashcards were perfect for quick study sessions. I could review anywhere, anytime. Best investment I made!",
      avatar: "/images/testimonial-alex.jpg",
    },
    {
      name: "Jordan Taylor",
      scoreImprovement: "+200 points",
      quote: "The micro-lessons broke down complex topics into digestible chunks. Made learning so much easier!",
      avatar: "/images/testimonial-jordan.jpg",
    },
    {
      name: "Riley Martinez",
      scoreImprovement: "+190 points",
      quote: "The progress tracking kept me motivated. Seeing my score climb week by week was incredibly rewarding.",
      avatar: "/images/testimonial-riley.jpg",
    },
  ],
  trustBar: {
    text: "Built by a student, for students.",
  },
  seo: {
    title: "PeakPrep — Mountain-themed SAT prep app",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
    ogImage: "/images/og-peakprep.png",
  },
};

