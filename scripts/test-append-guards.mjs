/* eslint-disable no-console */
/**
 * Regression checks for /api/generate-practice append guards.
 *
 * These cases must fail before any OpenAI call. Run against a local app server:
 *   OPENAI_API_KEY=dummy npm run dev
 *   npm run test:append-guards
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ORIGIN = process.env.ORIGIN || BASE_URL;
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
const prisma = new PrismaClient({ adapter });

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function makeQuestion(id) {
  return {
    id,
    passage: null,
    question: `If x + ${id} = ${id + 3}, what is the value of x?`,
    options: { A: "1", B: "2", C: "3", D: "4" },
    correctAnswer: "C",
    explanation: "",
    explanation_correct: "",
    explanation_incorrect: {},
    strategy_tip: "",
    difficulty: "Easy",
    skillFocus: "Linear Equations",
    skillCategory: "Linear Equations",
    section: "Math",
    graphData: null,
    desmosExpression: null,
    passageDomain: null,
  };
}

async function registerUser() {
  const email = `append-guard-${randomId()}@example.com`;
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({
      email,
      password: `AppendGuard-${randomId()}!`,
      name: "Append Guard",
      termsAccepted: true,
    }),
  });
  const body = await res.text();
  const cookie = res.headers.get("set-cookie")?.split(",")[0];
  if (!res.ok || !cookie) {
    throw new Error(`Register failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Registered user not found in database");
  return { user, cookie };
}

async function seedPracticeTest(userId, options = {}) {
  const count = options.count ?? 2;
  return prisma.practiceTest.create({
    data: {
      userId,
      section: options.section ?? "math",
      topic: options.topic ?? null,
      difficulty: options.difficulty ?? null,
      questions: JSON.stringify(Array.from({ length: count }, (_, idx) => makeQuestion(idx + 1))),
      passage: null,
      completedAt: options.completedAt ?? null,
      createdAt: options.createdAt ?? new Date(),
    },
  });
}

async function append(cookie, existingTestId, payload = {}) {
  const res = await fetch(`${BASE_URL}/api/generate-practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: ORIGIN },
    body: JSON.stringify({
      section: payload.section ?? "math",
      questionCount: payload.questionCount ?? 1,
      difficulty: payload.difficulty,
      topic: payload.topic,
      existingTestId,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

async function main() {
  const { user, cookie } = await registerUser();
  try {
    const completed = await seedPracticeTest(user.id, { completedAt: new Date() });
    const completedAppend = await append(cookie, completed.id);
    record(
      "completed practice tests cannot be appended",
      completedAppend.res.status === 409,
      `status=${completedAppend.res.status}`
    );

    const nearCap = await seedPracticeTest(user.id, { count: 49 });
    const capAppend = await append(cookie, nearCap.id, { questionCount: 2 });
    record(
      "append cannot exceed 50 questions",
      capAppend.res.status === 400,
      `status=${capAppend.res.status}`
    );

    const originalMath = await seedPracticeTest(user.id, { count: 2, section: "math" });
    const mismatchAppend = await append(cookie, originalMath.id, { section: "reading-writing" });
    record(
      "append must match original section/topic/difficulty",
      mismatchAppend.res.status === 409,
      `status=${mismatchAppend.res.status}`
    );

    const priorMonth = new Date();
    priorMonth.setMonth(priorMonth.getMonth() - 1);
    const staleFreeTier = await seedPracticeTest(user.id, { createdAt: priorMonth });
    const staleAppend = await append(cookie, staleFreeTier.id);
    record(
      "free users cannot append prior-month practice tests",
      staleAppend.res.status === 402,
      `status=${staleAppend.res.status}`
    );
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
