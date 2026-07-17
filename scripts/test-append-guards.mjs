import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const testGenerationRace = process.env.TEST_GENERATION_RACE === "1";
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl }),
});

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emailPrefix = `append-guards-${runId}`;

function makeQuestions(count, start = 1, label = "") {
  return Array.from({ length: count }, (_, idx) => {
    const id = start + idx;
    return {
      id,
      passage: null,
      question: `${label}What is the value of x in x + ${id} = ${id + 3}?`,
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
    // Keep an empty body so assertion failures still report the HTTP status.
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
    assert.deepEqual(
      body.questions.map((question) => question.id),
      [6, 7, 8]
    );
    await assertUnchanged(test.id, originalQuestions);
  }

  {
    const { user } = await createUser();
    const test = await createPracticeTest(user.id);
    const originalQuestions = JSON.parse(test.questions);
    const candidateA = JSON.stringify([
      ...originalQuestions,
      ...makeQuestions(2, 6, "A: "),
    ]);
    const candidateB = JSON.stringify([
      ...originalQuestions,
      ...makeQuestions(2, 6, "B: "),
    ]);
    const contenders = await Promise.all(
      [candidateA, candidateB].map((questions) =>
        prisma.practiceTest.updateMany({
          where: {
            id: test.id,
            userId: user.id,
            questions: test.questions,
            completedAt: null,
          },
          data: { questions },
        })
      )
    );
    assert.equal(
      contenders.reduce((sum, result) => sum + result.count, 0),
      1,
      "exactly one compare-and-swap append must win"
    );
    const persisted = await prisma.practiceTest.findUniqueOrThrow({
      where: { id: test.id },
      select: { questions: true },
    });
    assert.ok(
      persisted.questions === candidateA || persisted.questions === candidateB,
      "the winning append must be preserved without a lost write"
    );
    assert.equal(JSON.parse(persisted.questions).length, 7);
  }

  if (testGenerationRace) {
    const { user, session } = await createUser("ACTIVE");
    const test = await createPracticeTest(user.id);
    const results = await Promise.all([
      postAppend(session.id, test.id),
      postAppend(session.id, test.id),
    ]);
    for (const { response, body } of results) {
      assert.equal(response.status, 200, JSON.stringify(body));
      assert.deepEqual(
        body.questions.map((question) => question.id),
        [6, 7]
      );
    }
    const persisted = await prisma.practiceTest.findUniqueOrThrow({
      where: { id: test.id },
      select: { questions: true },
    });
    const persistedQuestions = JSON.parse(persisted.questions);
    assert.equal(
      persistedQuestions.length,
      7,
      "concurrent API appends from the same offset must persist one batch"
    );
    assert.deepEqual(results[0].body.questions, persistedQuestions.slice(5));
    assert.deepEqual(results[1].body.questions, persistedQuestions.slice(5));
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
