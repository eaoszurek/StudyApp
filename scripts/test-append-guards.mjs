/**
 * Focused non-AI regression checks for progressive practice append guards.
 *
 * These requests must fail before the route attempts any OpenAI call, so the
 * script only requires a running local Next server with a dummy OPENAI_API_KEY.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  }),
});

const createdUserIds = [];
const results = [];

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function makeQuestions(count) {
  return Array.from({ length: count }, (_unused, idx) => ({
    id: idx + 1,
    passage: null,
    question: `Seeded SAT math question ${idx + 1}: what is the value of x if x + ${idx + 1} = ${idx + 2}?`,
    options: { A: "0", B: "1", C: "2", D: "3" },
    correctAnswer: "B",
    explanation: "",
    explanation_correct: "",
    explanation_incorrect: {},
    strategy_tip: "",
    difficulty: "Easy",
    skillFocus: "Linear Equations",
    skillCategory: "Linear Equations",
    section: "Math",
  }));
}

function monthAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(1);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function seedPracticeTest({
  questionCount = 5,
  createdAt = new Date(),
  completedAt = null,
  section = "math",
  topic = null,
  difficulty = null,
  subscriptionStatus = null,
} = {}) {
  const email = `append-guard-${randomId()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Append Guard User",
      subscriptionStatus,
    },
  });
  createdUserIds.push(user.id);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const practiceTest = await prisma.practiceTest.create({
    data: {
      userId: user.id,
      section,
      topic,
      difficulty,
      questions: JSON.stringify(makeQuestions(questionCount)),
      passage: null,
      completedAt,
      createdAt,
    },
  });

  return {
    practiceTest,
    cookie: `auth_session=${session.id}`,
  };
}

async function postAppend(cookie, body) {
  const res = await fetch(`${BASE_URL}/api/generate-practice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: BASE_URL,
    },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function storedQuestionCount(testId) {
  const practiceTest = await prisma.practiceTest.findUnique({
    where: { id: testId },
    select: { questions: true },
  });
  if (!practiceTest?.questions) return 0;
  const parsed = JSON.parse(practiceTest.questions);
  return Array.isArray(parsed) ? parsed.length : 0;
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`Append guard regression checks @ ${BASE_URL}\n`);

  const completed = await seedPracticeTest({
    completedAt: new Date(),
    difficulty: "Easy",
  });
  const completedRes = await postAppend(completed.cookie, {
    section: "math",
    questionCount: 1,
    difficulty: "Easy",
    existingTestId: completed.practiceTest.id,
  });
  record(
    "completed practice tests cannot be appended",
    completedRes.status === 409,
    `status=${completedRes.status}`
  );
  record(
    "completed append leaves stored questions unchanged",
    (await storedQuestionCount(completed.practiceTest.id)) === 5
  );

  const mismatched = await seedPracticeTest({
    topic: "Linear Equations",
    difficulty: "Easy",
  });
  const mismatchRes = await postAppend(mismatched.cookie, {
    section: "math",
    questionCount: 1,
    topic: "Quadratic Equations",
    difficulty: "Easy",
    existingTestId: mismatched.practiceTest.id,
  });
  record(
    "append config must match existing test",
    mismatchRes.status === 400,
    `status=${mismatchRes.status}`
  );
  record(
    "config-mismatch append leaves stored questions unchanged",
    (await storedQuestionCount(mismatched.practiceTest.id)) === 5
  );

  const capped = await seedPracticeTest({
    questionCount: 49,
    difficulty: "Easy",
  });
  const cappedRes = await postAppend(capped.cookie, {
    section: "math",
    questionCount: 2,
    difficulty: "Easy",
    existingTestId: capped.practiceTest.id,
  });
  record(
    "append cannot exceed 50-question limit",
    cappedRes.status === 400,
    `status=${cappedRes.status}`
  );
  record(
    "over-cap append leaves stored questions unchanged",
    (await storedQuestionCount(capped.practiceTest.id)) === 49
  );

  const priorMonth = await seedPracticeTest({
    createdAt: monthAgo(),
    difficulty: "Easy",
  });
  const priorMonthRes = await postAppend(priorMonth.cookie, {
    section: "math",
    questionCount: 1,
    difficulty: "Easy",
    existingTestId: priorMonth.practiceTest.id,
  });
  record(
    "free users cannot append prior-month tests",
    priorMonthRes.status === 402,
    `status=${priorMonthRes.status}`
  );
  record(
    "prior-month append leaves stored questions unchanged",
    (await storedQuestionCount(priorMonth.practiceTest.id)) === 5
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });
