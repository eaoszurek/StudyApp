import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl }),
});

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emailPrefix = `append-guards-${runId}`;

function makeQuestions(count, start = 1) {
  return Array.from({ length: count }, (_, idx) => {
    const id = start + idx;
    return {
      id,
      passage: null,
      question: `What is the value of x in x + ${id} = ${id + 3}?`,
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
    };
  });
}

async function createUser(subscriptionStatus = null) {
  const user = await prisma.user.create({
    data: {
      email: `${emailPrefix}-${Math.random().toString(36).slice(2)}@example.com`,
      subscriptionStatus,
    },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { user, session };
}

async function createPracticeTest(userId, overrides = {}) {
  return prisma.practiceTest.create({
    data: {
      userId,
      section: "math",
      topic: "Linear Equations",
      difficulty: "Easy",
      questions: JSON.stringify(makeQuestions(overrides.questionCount ?? 5)),
      passage: null,
      ...overrides.data,
    },
  });
}

async function postAppend(sessionId, testId, payload = {}) {
  const response = await fetch(`${baseUrl}/api/generate-practice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      Cookie: `auth_session=${sessionId}`,
    },
    body: JSON.stringify({
      section: "math",
      questionCount: 2,
      topic: "Linear Equations",
      difficulty: "Easy",
      existingTestId: testId,
      expectedQuestionOffset: 5,
      ...payload,
    }),
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    // keep empty body for assertion output
  }
  return { response, body };
}

async function assertUnchanged(testId, expectedQuestionsJson) {
  const row = await prisma.practiceTest.findUniqueOrThrow({
    where: { id: testId },
    select: { questions: true },
  });
  assert.equal(row.questions, expectedQuestionsJson);
}

async function run() {
  await prisma.user.deleteMany({
    where: { email: { startsWith: "append-guards-" } },
  });

  {
    const { user, session } = await createUser();
    const test = await createPracticeTest(user.id, {
      data: { completedAt: new Date() },
    });
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id);
    assert.equal(response.status, 409, JSON.stringify(body));
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user, session } = await createUser();
    const test = await createPracticeTest(user.id);
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id, {
      section: "reading-writing",
    });
    assert.equal(response.status, 409, JSON.stringify(body));
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user, session } = await createUser();
    const test = await createPracticeTest(user.id, { questionCount: 49 });
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id, {
      questionCount: 2,
      expectedQuestionOffset: 49,
    });
    assert.equal(response.status, 400, JSON.stringify(body));
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user, session } = await createUser();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(15);
    const test = await createPracticeTest(user.id, {
      data: { createdAt: lastMonth },
    });
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id);
    assert.equal(response.status, 402, JSON.stringify(body));
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user, session } = await createUser();
    const test = await createPracticeTest(user.id);
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id, {
      expectedQuestionOffset: 6,
    });
    assert.equal(response.status, 409, JSON.stringify(body));
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user, session } = await createUser();
    const test = await createPracticeTest(user.id, { questionCount: 8 });
    const originalQuestions = test.questions;
    const { response, body } = await postAppend(session.id, test.id, {
      questionCount: 3,
      expectedQuestionOffset: 5,
    });
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.id, test.id);
    assert.equal(body.questions.length, 3);
    assert.deepEqual(
      body.questions.map((q) => q.id),
      [6, 7, 8]
    );
    await assertUnchanged(test.id, originalQuestions);
  }

  console.log("append guard regression checks passed");
}

try {
  await run();
} finally {
  await prisma.user.deleteMany({
    where: { email: { startsWith: "append-guards-" } },
  });
  await prisma.$disconnect();
}
