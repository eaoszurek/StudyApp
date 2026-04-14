/**
 * Lightweight checks that generated practice content matches a user-selected topic.
 * Used to filter/retry when topic-locked mode is on (SAT practice config).
 *
 * Design intent: enforce clear topical alignment for topic-locked generation.
 * This filter should reject drift rather than pass-through by default.
 */

const MATH_TOPIC_PATTERNS: Record<string, RegExp> = {
  probability: /probability|probable|odds|P\(|random(ly)?|chance|likelihood|independent|mutually exclusive|compound|sample space|outcome|event|fair (coin|die|dice)|marble|deck|spinner|percent chance/i,
  statistics: /mean|median|mode|range|standard deviation|data set|survey|sample|distribution|quartile|outlier/i,
  "data interpretation": /table|chart|graph|scatterplot|histogram|bar graph|line graph|data (point|set)/i,
  scatterplots: /scatterplot|scatter plot|point on the graph|plotted|coordinates.*data/i,
  percentages: /percent(age)?|%\b|increase.*percent|decrease.*percent|of the total/i,
  "ratios and proportions": /ratio|proportion|scale|similar.*figure|correspond(ing)? side/i,
  "linear equations": /linear equation|solve for|value of x|satisfies the equation|system of equation/i,
  "systems of linear equations": /system of|two equations|simultaneous|intersection.*line/i,
  "linear inequalities": /inequalit|solution region|number line.*inequal/i,
  "linear functions": /linear function|f\(x\)|slope|y-intercept|rate of change.*linear/i,
  "graphing linear equations": /graph.*line|coordinate plane.*line|slope.*intercept/i,
  "slope and intercepts": /slope|intercept|parallel lines|perpendicular/i,
  "quadratic equations": /quadratic|parabola|vertex|factored form|discriminant|x²|x2/i,
  polynomials: /polynomial|degree of|coefficient|factor.*polynomial/i,
  "exponential functions": /exponential|growth factor|decay|compound interest|initial value.*growth/i,
  "radical expressions": /radical|square root|√|simplify.*root/i,
  "rational expressions": /rational expression|asymptote|exclude.*value.*denominator/i,
  "nonlinear functions": /nonlinear|piecewise|function notation.*non/i,
  geometry: /triangle|rectangle|parallel|angle|congruent|similar|polygon|perpendicular/i,
  circles: /circle|radius|diameter|equation of the circle|arc|sector/i,
  trigonometry: /sin|cos|tan|sine|cosine|tangent|right triangle.*angle/i,
  "complex numbers": /complex number|a \+ bi|i²|imaginary/i,
  "volume and surface area": /volume|surface area|cylinder|prism|sphere|cone/i,
  "right triangle trigonometry": /SOHCAHTOA|right triangle|hypotenuse|opposite|adjacent/i,
};

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

/**
 * Returns true if the question plausibly matches the locked topic.
 *
 * Order of checks:
 * 1. skillCategory/skillFocus exact or near match — pass immediately.
 * 2. Known math pattern regex matches stem or skill — pass.
 * 3. For R&W: any keyword overlap — pass.
 * 4. If no pattern is registered for this topic AND no obvious mismatch
 *    can be detected, pass (permissive default).
 */
export function questionAlignsWithLockedTopic(
  topic: string,
  section: "math" | "reading" | "writing",
  q: { question: string; skillCategory?: string; skillFocus?: string }
): boolean {
  const t = normalizeTopicKey(topic);
  if (!t) return true;

  const skill = String(q.skillCategory || q.skillFocus || "").toLowerCase().trim();
  const stem = String(q.question || "").toLowerCase();

  // 1. Skill label is an explicit match or substring match (either way around)
  if (skill.length > 0) {
    if (skill.includes(t) || t.includes(skill.slice(0, Math.min(skill.length, 16)))) {
      return true;
    }
    // Fuzzy: share at least one significant word (>3 chars)
    const topicWords = t.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const skillWords = skill.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    if (topicWords.length > 0 && skillWords.some((w) => topicWords.includes(w))) {
      return true;
    }
  }

  // 2. Registered regex pattern for this math topic
  if (section === "math") {
    const pattern = MATH_TOPIC_PATTERNS[t];
    if (pattern) {
      return pattern.test(stem) || pattern.test(skill);
    }
    // Fuzzy: find the closest registered pattern key
    const fuzzyKey = Object.keys(MATH_TOPIC_PATTERNS).find(
      (k) => t.includes(k) || k.includes(t) || k.split(" ").some((w) => w.length > 3 && t.includes(w))
    );
    if (fuzzyKey && MATH_TOPIC_PATTERNS[fuzzyKey]) {
      const re = MATH_TOPIC_PATTERNS[fuzzyKey];
      return re.test(stem) || re.test(skill);
    }
    // Unknown math topic with no clear lexical alignment -> reject.
    return false;
  }

  // 3. Reading & Writing: require meaningful keyword overlap
  const words = t.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (words.length === 0) return false;
  const matches = words.filter((w) => stem.includes(w) || skill.includes(w));
  return matches.length >= Math.min(2, words.length);
}
