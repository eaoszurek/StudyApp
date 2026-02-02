"use strict";

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = process.env.AI_SAMPLE_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = process.env.AI_SAMPLE_OUTPUT_DIR || "samples/ai";

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-");

const scenarios = [
  {
    name: "practice-math-linear",
    endpoint: "/api/generate-practice",
    body: { section: "math", questionCount: 5, topic: "linear equations", difficulty: "Easy" },
  },
  {
    name: "practice-reading-main-idea",
    endpoint: "/api/generate-practice",
    body: { section: "reading", questionCount: 5, topic: "main idea", difficulty: "Medium" },
  },
  {
    name: "practice-writing-commas",
    endpoint: "/api/generate-practice",
    body: { section: "writing", questionCount: 5, topic: "comma usage", difficulty: "Easy" },
  },
  {
    name: "flashcards-quadratics",
    endpoint: "/api/generate-flashcards",
    body: { topic: "quadratic equations" },
  },
  {
    name: "lesson-grammar",
    endpoint: "/api/ai/lessons",
    body: { topic: "subject-verb agreement", difficulty: "easy" },
  },
  {
    name: "plan-personalized",
    endpoint: "/api/generate-personalized-plan",
    body: {
      answers: {
        targetScore: "1350",
        testDate: "3 months",
        weakestSection: "Math Calc",
        hoursPerDay: "1 hour",
        studyStyle: "Short daily sessions",
        notes: "Struggle with word problems",
      },
      performanceData: null,
    },
  },
  {
    name: "legacy-question",
    endpoint: "/api/generate-question",
    body: { topic: "proportions" },
  },
  {
    name: "legacy-plan",
    endpoint: "/api/generate-plan",
    body: { subject: "SAT Math" },
  },
];

async function runScenario(scenario) {
  const url = `${BASE_URL}${scenario.endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario.body),
  });

  const result = {
    ok: response.ok,
    status: response.status,
    endpoint: scenario.endpoint,
    body: scenario.body,
    data: await response.json().catch(() => ({ error: "Invalid JSON response" })),
  };

  return result;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const scenario of scenarios) {
    console.log(`Running ${scenario.name}...`);
    const result = await runScenario(scenario);
    results.push({ name: scenario.name, ...result });
  }

  const outputPath = join(OUTPUT_DIR, `ai-sample-${stamp}.json`);
  await writeFile(outputPath, JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));

  console.log(`Saved results to ${outputPath}`);
  console.log("Done.");
}

main().catch((error) => {
  console.error("AI sample run failed:", error);
  process.exit(1);
});
