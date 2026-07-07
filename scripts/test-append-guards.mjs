#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  }),
});

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function makeQuestions(count) {
  return Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    passage: null,
    question: `If x = ${idx + 1}, what is the value of x + 1?`,
    options: {
      A: String(idx + 2),
      B: String(idx + 3),
      C: String(idx + 4),
      D: String(idx + 5),
    },
    correctAnswer: "A",
    explanation: "",
    explanation_correct: "",
    explanation_incorrect: {},
    strategy_tip: "",
    difficulty: "Easy",
    skillFocus: "Linear Equations",
    skillCategory: "Linear Equations",
    section: "Math",
    graphData: undefined,
    desmosExpression: undefined,
    passageDomain: null,
  }));
}

function parseQuestionCount(rawQuestions) {
  try {
    const parsed = JSON.parse(rawQuestions || "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return -1;
  }
}

async function createUserSession() {
  const user = await prisma.user.create({
    data: {
      email: `append-guard-${randomId()}@example.com`,
      name: "Append Guard Test",
      passwordHash: "not-used",
      emailVerified: true,
    },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { user, cookie: `auth_session=${session.id}` };
}

async function postAppend(cookie, existingTestId, payload = {}) {
  const res = await fetch(`${BASE_URL}/api/generate-practice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      section: "math",
      questionCount: 1,
      difficulty: "Mixed",
      existingTestId,
      ...payload,
    }),
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // ignore non-JSON error bodies
  }
  return { res, body };
}

async function runCase(name, setup, expectedStatus, payload) {
  const { user, cookie } = await createUserSession();
  try {
    const test = await setup(user.id);
    const before = parseQuestionCount(test.questions);
    const { res, body } = await postAppend(cookie, test.id, payload);
    const after = await prisma.practiceTest.findUnique({ where: { id: test.id } });
    const afterCount = parseQuestionCount(after?.questions);

    const ok = res.status === expectedStatus && afterCount === before;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${name} | status=${res.status} expected=${expectedStatus} before=${before} after=${afterCount} error=${body?.error || ""}`
    );

    if (!ok) {
      throw new Error(`${name} failed`);
    }
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
}

async function createPracticeTest(userId, overrides = {}) {
  const questionCount = overrides.questionCount ?? 2;
  return prisma.practiceTest.create({
    data: {
      userId,
      section: overrides.section ?? "math",
      topic: overrides.topic ?? null,
      difficulty: overrides.difficulty ?? null,
      questions: JSON.stringify(makeQuestions(questionCount)),
      passage: null,
      completedAt: overrides.completedAt ?? null,
      createdAt: overrides.createdAt ?? new Date(),
    },
  });
}

async function main() {
  await runCase(
    "completed practice tests reject append",
    (userId) => createPracticeTest(userId, { completedAt: new Date() }),
    409
  );

  await runCase(
    "append settings must match original test",
    (userId) => createPracticeTest(userId),
    422,
    { section: "reading-writing" }
  );

  await runCase(
    "append cannot exceed 50 total questions",
    (userId) => createPracticeTest(userId, { questionCount: 49 }),
    400,
    { questionCount: 2 }
  );

  const priorMonth = new Date();
  priorMonth.setMonth(priorMonth.getMonth() - 1);
  priorMonth.setDate(1);
  priorMonth.setHours(12, 0, 0, 0);

  await runCase(
    "free users cannot append to prior-month tests",
    (userId) => createPracticeTest(userId, { createdAt: priorMonth }),
    402
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
