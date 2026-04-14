export const landingContent = {
  hero: {
    variantA: {
      headline: "Higher score, less guesswork.",
      subhead:
        "Peak Prep finds your weak skills, builds your daily 15-minute climb, and gives instant explanations when you miss a question.",
      ctaPrimary: "Start Free Checkpoint",
      ctaSecondary: "See How It Works",
    },
    variantB: {
      headline: "From confused to confident in 15 minutes a day.",
      subhead:
        "Stop guessing what to study. Get a personalized SAT climb plan that updates with your progress.",
      ctaPrimary: "Start Free Checkpoint",
      ctaSecondary: "See How It Works",
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
        name: "Free Starter",
        price: "$0",
        period: "forever",
        features: [
          "Limited checkpoints",
          "Basic skill report",
          "Preview of your study plan",
          "No credit card needed",
        ],
        cta: "Start Free",
        popular: false,
      },
      {
        id: "pro",
        name: "Peak Prep Plus",
        price: "$5",
        period: "month",
        features: [
          "Unlimited practice tests",
          "Full adaptive study plan",
          "Trail Buddy AI help on every question",
          "Detailed skill tracking",
          "Faster path to your target score",
          "Cancel anytime",
        ],
        cta: "Unlock Plus for $5",
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
  testimonials: [
    {
      name: "Jordan K.",
      scoreImprovement: "+90 pts",
      quote:
        "Not gonna pretend I love flashcards. I just needed someone to tell me what to do each day. I open it, do the chunk, done—way less spinning my wheels.",
    },
    {
      name: "Alex M.",
      scoreImprovement: "+120 pts",
      quote:
        "Full practice runs are what helped. When I missed one it actually walked through the reasoning instead of just marking it wrong.",
    },
    {
      name: "Riley T.",
      scoreImprovement: "+100 pts",
      quote:
        "Shooting for pretty picky schools. The plan + regular tests makes it harder to lie to myself about what I still don't get.",
    },
  ],
  testimonialsDisclaimer: "Representative student experiences.",
  trustBar: {
    text: "Built by a student, for students.",
  },
  seo: {
    title: "PeakPrep — Mountain-themed SAT prep app",
    description: "PeakPrep personalizes your SAT study with Route Maps, Tools & Supplies flashcards, micro-lessons, and checkpoint practice tests. Climb your way to your target score.",
    ogImage: "/images/og-peakprep.png",
  },
};

