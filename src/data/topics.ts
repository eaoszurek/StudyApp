/**
 * SAT Skill Domains - Official College Board Categories
 * Organized by section with specific skill areas
 */

export const SAT_TOPICS = {
  /**
   * Digital SAT Math — four content domains. Approximate section share:
   * Algebra 35% · Advanced Math 35% · Problem-Solving & Data 15% · Geometry & Trig 15%
   */
  Math: [
    // Algebra — linear relationships (~35%, ~13–15 questions)
    "Linear Equations",
    "Linear Functions",
    "Systems of Equations",
    "Linear Inequalities",

    // Advanced Math — non-linear and higher-degree (~35%, ~13–15 questions)
    "Quadratic Equations",
    "Polynomials",
    "Non-linear Functions",
    "Rational Expressions",

    // Problem-Solving and Data Analysis (~15%, ~5–7 questions)
    "Ratios & Rates",
    "Percentages",
    "Statistics",
    "Data Interpretation",

    // Geometry and Trigonometry (~15%, ~5–7 questions)
    "Area & Volume",
    "Triangles",
    "Trigonometry",
    "Circles",
  ],
  
  // Digital SAT Reading & Writing — the single canonical list of 10 sub-skills.
  // Reading and Writing share the same list because the Digital SAT combines them
  // into one R&W section with the same four content domains.
  Reading: [
    // Information and Ideas (~26% of R&W section)
    "Central Ideas and Details",
    "Command of Evidence",
    "Inferences",

    // Craft and Structure (~28% of R&W section)
    "Words in Context",
    "Text Structure and Purpose",
    "Cross-Text Connections",

    // Expression of Ideas (~20% of R&W section)
    "Rhetorical Synthesis",
    "Transitions",

    // Standard English Conventions (~26% of R&W section)
    "Sentence Boundaries",
    "Form, Structure, and Sense",
  ],

  Writing: [
    "Central Ideas and Details",
    "Command of Evidence",
    "Inferences",
    "Words in Context",
    "Text Structure and Purpose",
    "Cross-Text Connections",
    "Rhetorical Synthesis",
    "Transitions",
    "Sentence Boundaries",
    "Form, Structure, and Sense",
  ],
};

/**
 * Short “what this includes” text for the practice config dropdown (shown after the topic name in parentheses).
 * Keys must match SAT_TOPICS entries exactly; values are plain phrases without outer parentheses.
 */
export const TOPIC_DROPDOWN_HELP: Record<string, string> = {
  // Math (Digital SAT — four domains)
  "Linear Equations": "solving equations in one or two variables",
  "Linear Functions": "interpreting and graphing functions such as f(x) = mx + b",
  "Systems of Equations": "solving two linear equations simultaneously; substitution, elimination, intersection",
  "Linear Inequalities": "solving and graphing inequalities in one or two variables",
  "Quadratic Equations": "factoring, quadratic formula, and analyzing parabolas",
  "Polynomials": "adding, subtracting, and multiplying polynomial expressions",
  "Non-linear Functions": "exponential growth and decay, and radical (root) relationships",
  "Rational Expressions": "simplifying and solving when variables appear in the denominator",
  "Ratios & Rates": "unit conversion and proportional relationships; scaling",
  "Percentages": "percent change, increase, and decrease; percent of a whole",
  "Statistics": "mean, median, mode, range, and standard deviation",
  "Data Interpretation": "scatterplots, histograms, and box-and-whisker plots; read trends from displays",
  "Area & Volume": "formulas for triangles, rectangles, circles, prisms, and cylinders",
  "Triangles": "isosceles, equilateral, and special right triangles, e.g. 30-60-90 and 45-45-90",
  "Trigonometry": "sine, cosine, and tangent in right triangles (SOH CAH TOA)",
  "Circles": "arc length, sector area, and the equation of a circle in the plane",

  // Reading & Writing (Digital SAT) — 10 sub-skills
  "Central Ideas and Details": "main point, best evidence, what the text states",
  "Command of Evidence": "which detail supports, quantitative support, underlined evidence",
  "Inferences": "implied information, what reasonably follows, logical conclusions",
  "Words in Context": "vocabulary in context, best word to preserve meaning and tone",
  "Text Structure and Purpose": "why the text exists, how parts fit together, rhetorical function",
  "Cross-Text Connections": "compare or relate two short passages, agreement and tension",
  "Rhetorical Synthesis": "notes, bullets, or list → choose the best sentence for a goal",
  "Transitions": "logical links between ideas, clauses, and paragraphs (words or phrases)",
  "Sentence Boundaries": "commas, semicolons, colons, splices, fragments, and sentence boundaries",
  "Form, Structure, and Sense": "agreement, tense, pronouns, placement of modifiers, conventional grammar",
};

export function getTopicDropdownLabel(topic: string): string {
  const help = TOPIC_DROPDOWN_HELP[topic];
  return help ? `${topic} (${help})` : topic;
}

/** Which of the four Math domains a sub-skill belongs to (for variety / word-problem checks). */
export const MATH_TOPIC_DOMAIN = {
  "Linear Equations": "Algebra",
  "Linear Functions": "Algebra",
  "Systems of Equations": "Algebra",
  "Linear Inequalities": "Algebra",
  "Quadratic Equations": "Advanced Math",
  "Polynomials": "Advanced Math",
  "Non-linear Functions": "Advanced Math",
  "Rational Expressions": "Advanced Math",
  "Ratios & Rates": "Problem-Solving and Data Analysis",
  Percentages: "Problem-Solving and Data Analysis",
  Statistics: "Problem-Solving and Data Analysis",
  "Data Interpretation": "Problem-Solving and Data Analysis",
  "Area & Volume": "Geometry and Trigonometry",
  Triangles: "Geometry and Trigonometry",
  Trigonometry: "Geometry and Trigonometry",
  Circles: "Geometry and Trigonometry",
} as const satisfies Record<string, string>;

export type MathContentDomain = (typeof MATH_TOPIC_DOMAIN)[keyof typeof MATH_TOPIC_DOMAIN];

/**
 * Map a `skillCategory` (or topic lock string) to a Math domain. Handles exact names and light model drift.
 */
export function getMathTopicDomain(skillOrTopic: string): MathContentDomain | "Unknown" {
  const t = skillOrTopic.trim();
  if (!t) return "Unknown";
  for (const [name, domain] of Object.entries(MATH_TOPIC_DOMAIN) as [string, MathContentDomain][]) {
    if (name.toLowerCase() === t.toLowerCase()) return domain;
  }
  const s = t.toLowerCase();

  if (
    s.includes("linear equation") ||
    s.includes("linear function") ||
    (s.includes("system") && s.includes("equation")) ||
    s.includes("linear inequal")
  ) {
    return "Algebra";
  }
  if (
    s.includes("quadratic") ||
    s.includes("polynomial") ||
    s.includes("non-linear") ||
    s.includes("nonlinear function") ||
    s.includes("rational exp")
  ) {
    return "Advanced Math";
  }
  if (
    s.includes("trigonometry") ||
    s.includes("sohcahtoa") ||
    s.includes("sine, cosine, and tangent") ||
    s.includes("arc length") ||
    s.includes("sector area") ||
    (s.includes("circle") && s.includes("equation"))
  ) {
    return "Geometry and Trigonometry";
  }
  if (s.includes("isosceles") || s.includes("equilateral") || s.includes("30-60-90") || s.includes("45-45-90") || s.includes("right triangle trigon")) {
    return "Geometry and Trigonometry";
  }
  if (s.includes("prism") || (s.includes("cylinder") && s.includes("volume")) || s.includes("area & volume") || s.includes("area and volume")) {
    return "Geometry and Trigonometry";
  }
  if (s.includes("ratio") || s.includes("proportio") || s.includes(" percent") || s.includes("percenta") || s.includes("unit rate") || s.includes("statistic") || s.includes("data interpretation") || s.includes("scatterplot") || s.includes("scatter plot") || s.includes("histogram") || (s.includes("box") && s.includes("whisk"))) {
    return "Problem-Solving and Data Analysis";
  }
  if (s.includes("triangle") && (s.includes("pythag") || s.includes("hypotenuse"))) {
    return "Geometry and Trigonometry";
  }

  return "Unknown";
}

/**
 * Get all topics for a section
 */
export function getTopicsForSection(section: "math" | "reading" | "writing" | "reading-writing"): string[] {
  if (section === "reading-writing" || section === "reading") {
    return SAT_TOPICS.Reading;
  }
  const sectionKey = section.charAt(0).toUpperCase() + section.slice(1) as keyof typeof SAT_TOPICS;
  return SAT_TOPICS[sectionKey] || [];
}

/**
 * Get random topic for a section
 */
export function getRandomTopic(section: "math" | "reading" | "writing" | "reading-writing"): string {
  const topics = getTopicsForSection(section);
  return topics[Math.floor(Math.random() * topics.length)];
}
  