import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `append-guards-${unique}@example.com`;

function makeQuestion(id) {
  return {
    id,
    question: `What is ${id} + 1?`,
    options: ["1", "2", "3", "4"],
    correctAnswer: "B",
    section: "Math",
    skillCategory: "Linear Equations",
    difficulty: "Easy",
  };
}

async function postAppend(sessionId, body) {
  const res = await fetch(`${appUrl}/api/generate-practice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: appUrl,
      Cookie: `auth_session=${sessionId}`,
    },
    body: JSON.stringify(body),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    // Keep default object for non-JSON failures; assertions include status.
  }
  return { res, json };
}

async function questionCount(testId) {
  const row = await prisma.practiceTest.findUniqueOrThrow({
    where: { id: testId },
    select: { questions: true },
  });
  return JSON.parse(row.questions).length;
}

async function main() {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Append Guard Tester",
      emailVerified: true,
    },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const baseTest = {
    userId: user.id,
    section: "math",
    difficulty: null,
    passage: null,
  };

  const completed = await prisma.practiceTest.create({
    data: {
      ...baseTest,
      topic: null,
      questions: JSON.stringify(Array.from({ length: 5 }, (_, i) => makeQuestion(i + 1))),
      completedAt: new Date(),
    },
  });

  const mismatched = await prisma.practiceTest.create({
    data: {
      ...baseTest,
      topic: "Linear Equations",
      questions: JSON.stringify(Array.from({ length: 5 }, (_, i) => makeQuestion(i + 1))),
    },
  });

  const capped = await prisma.practiceTest.create({
    data: {
      ...baseTest,
      topic: null,
      questions: JSON.stringify(Array.from({ length: 49 }, (_, i) => makeQuestion(i + 1))),
    },
  });

  const priorMonth = new Date();
  priorMonth.setMonth(priorMonth.getMonth() - 1);
  priorMonth.setDate(1);
  priorMonth.setHours(0, 0, 0, 0);
  const priorMonthTest = await prisma.practiceTest.create({
    data: {
      ...baseTest,
      topic: null,
      questions: JSON.stringify(Array.from({ length: 5 }, (_, i) => makeQuestion(i + 1))),
      createdAt: priorMonth,
    },
  });

  try {
    const completedResult = await postAppend(session.id, {
      section: "math",
      questionCount: 5,
      existingTestId: completed.id,
    });
    assert.equal(completedResult.res.status, 409, "completed test append should be rejected");
    assert.equal(await questionCount(completed.id), 5, "completed test should remain unchanged");

    const mismatchResult = await postAppend(session.id, {
      section: "math",
      questionCount: 5,
      topic: "Ratios & Rates",
      existingTestId: mismatched.id,
    });
    assert.equal(mismatchResult.res.status, 409, "config-mismatched append should be rejected");
    assert.equal(await questionCount(mismatched.id), 5, "mismatched test should remain unchanged");

    const capResult = await postAppend(session.id, {
      section: "math",
      questionCount: 2,
      existingTestId: capped.id,
    });
    assert.equal(capResult.res.status, 400, "append beyond 50-question cap should be rejected");
    assert.equal(await questionCount(capped.id), 49, "capped test should remain unchanged");

    const priorMonthResult = await postAppend(session.id, {
      section: "math",
      questionCount: 5,
      existingTestId: priorMonthTest.id,
    });
    assert.equal(priorMonthResult.res.status, 402, "free-tier prior-month append should be rejected");
    assert.equal(await questionCount(priorMonthTest.id), 5, "prior-month test should remain unchanged");

    console.log("append guard checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
