/**
 * SAT Skill Domains - Official College Board Categories
 * Organized by section with specific skill areas
 */

export const SAT_TOPICS = {
  Math: [
    // Heart of Algebra (35% of Math section)
    "Linear Equations",
    "Systems of Linear Equations",
    "Linear Inequalities",
    "Linear Functions",
    "Graphing Linear Equations",
    "Slope and Intercepts",
    
    // Problem Solving & Data Analysis (15% of Math section)
    "Ratios and Proportions",
    "Percentages",
    "Statistics",
    "Data Interpretation",
    "Scatterplots",
    "Probability",
    
    // Passport to Advanced Math (35% of Math section)
    "Quadratic Equations",
    "Polynomials",
    "Exponential Functions",
    "Radical Expressions",
    "Rational Expressions",
    "Nonlinear Functions",
    
    // Additional Topics in Math (15% of Math section)
    "Geometry",
    "Circles",
    "Trigonometry",
    "Complex Numbers",
    "Volume and Surface Area",
    "Right Triangle Trigonometry",
  ],
  
  Reading: [
    // Information & Ideas (28% of Reading section)
    "Main Idea",
    "Supporting Details",
    "Central Ideas",
    "Summarizing",
    "Textual Evidence",
    
    // Craft & Structure (28% of Reading section)
    "Vocabulary in Context",
    "Word Choice",
    "Text Structure",
    "Author's Purpose",
    "Point of View",
    "Rhetorical Analysis",
    
    // Integration of Knowledge & Ideas (14% of Reading section)
    "Comparing Texts",
    "Analyzing Arguments",
    "Evaluating Evidence",
    "Data Interpretation",
    
    // Passage Types
    "Literature Passages",
    "Historical Documents",
    "Social Science Passages",
    "Science Passages",
    "Paired Passages",
  ],
  
  Writing: [
    // Expression of Ideas (24% of Writing section)
    "Transitions",
    "Sentence Placement",
    "Paragraph Organization",
    "Rhetorical Synthesis",
    "Logical Sequence",
    "Conciseness",
    
    // Standard English Conventions (26% of Writing section)
    "Subject-Verb Agreement",
    "Pronoun Agreement",
    "Verb Tense",
    "Parallel Structure",
    "Modifier Placement",
    "Punctuation",
    "Commas",
    "Apostrophes",
    "Colons and Semicolons",
    "Idioms and Word Choice",
    "Sentence Boundaries",
  ],
};

/**
 * Get all topics for a section
 */
export function getTopicsForSection(section: "math" | "reading" | "writing"): string[] {
  const sectionKey = section.charAt(0).toUpperCase() + section.slice(1) as keyof typeof SAT_TOPICS;
  return SAT_TOPICS[sectionKey] || [];
}

/**
 * Get random topic for a section
 */
export function getRandomTopic(section: "math" | "reading" | "writing"): string {
  const topics = getTopicsForSection(section);
  return topics[Math.floor(Math.random() * topics.length)];
}
  