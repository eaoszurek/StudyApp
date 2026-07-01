/**
 * Lightweight checks that generated practice content matches a user-selected topic.
 * Used to filter/retry when topic-locked mode is on (SAT practice config).
 *
 * Design intent: enforce clear topical alignment for topic-locked generation.
 * This filter should reject drift rather than pass-through by default.
 */

const MATH_TOPIC_PATTERNS: Record<string, RegExp> = {
  // Current Digital SAT Math sub-skills (see src/data/topics.ts)
  "linear equations": /linear equation|solve for|value of x|satisfies the (equation|inequal)|one-? or two-? variable/i,
  "linear functions": /linear function|f\(x\)|slope|y-?intercept|rate of change|graph(ing)?.*function|coordinate.*line/i,
  "systems of equations": /system of|simultaneous|two (linear )?equations|substitution|elimination|intersection of.*line/i,
  "linear inequalities": /inequalit|number line|solution (region|set)/i,
  "quadratic equations": /quadratic|parabola|vertex|factored form|discriminant|x²|x2|completing the square|quadratic formula/i,
  polynomials: /polynomial|degree of|add(ing|ition)?.*polynomial|subtract(ing|ion)?|multiply(ing|ication)?/i,
  "non-linear functions": /non-?linear|exponential( growth| decay)?|radical( equation| function)?|√|not linear|growth factor|decay constant/i,
  "rational expressions": /rational exp|asymptote|denominator|exclude.*(value|domain)|undefined (when|if)/i,
  "ratios & rates": /ratio|proportion|unit (rate|conversion)|scale factor|miles per|per hour|per minute|dollars per/i,
  percentages: /percent(age)?|%\b|increase|decrease|percent (change| of)/i,
  statistics: /mean|median|mode|range|standard deviation|data set|survey|quartile|outlier|distribution of.*data/i,
  "data interpretation": /scatterplot|scatter plot|histogram|box-?and-?whisker|read.*(chart|graph|table)|trend|plotted|data (point|display)/i,
  "area & volume": /area of|volume of|prism|cylinder|surface area|rectangular|triangular solid|cone|sphere(?!r)/i,
  triangles: /isosceles|equilateral|pythag|hypotenuse|legs? of( the| a) triangle|30-?60-?90|45-?45-?90|special right|congruent triangle/i,
  trigonometry: /sin(?!k)|cos(?!t)|\btan\b|sine|cosine|tangent|SOHCAHTOA|soh cah toa|right triangle|opposite|adjacent(?!t)/i,
  circles: /circle|radius|diameter|arc length|sector area|standard form|equation of (the|a) circle|center.*circle/i,
  // Legacy names (older configs / localStorage)
  "systems of linear equations": /system of|simultaneous|two (linear )?equations/i,
  "ratios and proportions": /ratio|proportion|scale|unit rate|correspond(ing)? side/i,
  "graphing linear equations": /graph(ing)?.*line|coordinate plane|slope.*line/i,
  "slope and intercepts": /slope|y-?intercept|parallel lines|perpendicular lines/i,
  scatterplots: /scatterplot|scatter plot|line of best fit|plotted|correlat/i,
  probability: /probability|probable|odds|random(ly)?|chance|outcome|event|independent|compound/i,
  "exponential functions": /exponential( growth| decay)?|compound interest|initial value|growth factor/i,
  "radical expressions": /radical|square root|√|rationali[sz]e.*root/i,
  "nonlinear functions": /non-?linear|exponential|radical(?!d)/i,
  geometry: /angle|parallel|perpendicular|polygon|perimeter|length of.*side(?!-)/i,
  "complex numbers": /complex number|a \+ bi|i²|imaginary/i,
  "volume and surface area": /volume|surface area|prism|cylinder|sphere|cone/i,
  "right triangle trigonometry": /SOHCAHTOA|right triangle|hypotenuse|opposite|adjacent/i,
};

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

/**
 * Strict equality check between two skill labels after light normalization.
 * Used as the first gate in topic-locked mode so the model can't drift to
 * an adjacent skill (e.g. "Linear Functions" when "Linear Equations" is locked).
 */
export function skillExactlyMatchesTopic(
  topic: string,
  skill: string | undefined | null
): boolean {
  const t = normalizeTopicKey(topic);
  const s = String(skill || "").trim().toLowerCase();
  if (!t || !s) return false;
  if (t === s) return true;
  const stripped = (text: string) => text.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return stripped(t) === stripped(s);
}

/**
 * Returns true if the question plausibly matches the locked topic.
 *
 * Order of checks:
 * 1. skillCategory/skillFocus exact match — pass immediately.
 * 2. skillCategory/skillFocus substring or shared-word match — pass.
 * 3. Known math pattern regex matches stem or skill — pass.
 * 4. For R&W: any keyword overlap — pass.
 * 5. If no pattern is registered for this topic AND no obvious mismatch
 *    can be detected, pass (permissive default).
 */
export function questionAlignsWithLockedTopic(
  topic: string,
  section: "math" | "reading" | "writing" | "reading-writing",
  q: { question: string; skillCategory?: string; skillFocus?: string }
): boolean {
  const t = normalizeTopicKey(topic);
  if (!t) return true;

  const skill = String(q.skillCategory || q.skillFocus || "").toLowerCase().trim();
  const stem = String(q.question || "").toLowerCase();

  // 1. Strict equality (after light normalization) — fast path
  if (skillExactlyMatchesTopic(topic, skill)) {
    return true;
  }

  // 2. Skill label is an explicit substring match (either way around) or shares a significant word
  if (skill.length > 0) {
    if (skill.includes(t) || t.includes(skill.slice(0, Math.min(skill.length, 16)))) {
      return true;
    }
    const topicWords = t.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const skillWords = skill.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    if (topicWords.length > 0 && skillWords.some((w) => topicWords.includes(w))) {
      return true;
    }
  }

  // 3. Registered regex pattern for this math topic
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

  // 4. Reading & Writing: require meaningful keyword overlap
  const words = t.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (words.length === 0) return false;
  const matches = words.filter((w) => stem.includes(w) || skill.includes(w));
  return matches.length >= Math.min(2, words.length);
}
