#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const appBaseUrl = process.env.TEST_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const mockOpenAiPort = Number(process.env.MOCK_OPENAI_PORT || 4010);
const mockOpenAiBaseUrl = `http://127.0.0.1:${mockOpenAiPort}/v1`;
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL !== mockOpenAiBaseUrl) {
  throw new Error(
    `Start the app with OPENAI_BASE_URL=${mockOpenAiBaseUrl} before running this script.`
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl }),
});

let openAiCallCount = 0;

function jsonResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function mockQuestion(seed) {
  const rate = seed + 2;
  const fee = seed + 5;
  const total = rate * 3 + fee;
  const scenarios = [
    `A ride-share company charges a flat booking fee of $${fee} plus $${rate} per mile. If a ride costs $${total}, how many miles long is the ride?`,
    `A plant is ${fee} centimeters tall and grows ${rate} centimeters each week. After how many weeks will the plant be ${total} centimeters tall?`,
    `A gym charges a signup fee of $${fee} and $${rate} for each class. If a member pays $${total} total, how many classes did the member take?`,
    `A rental shop charges $${fee} plus $${rate} per hour for a kayak. If the total rental cost is $${total}, how many hours was the kayak rented?`,
  ];
  return {
    _scratchpad: "Solve the linear equation for x.",
    passage: null,
    question: scenarios[seed % scenarios.length],
    options: ["1", "2", "3", "4"],
    section: "Math",
    skillCategory: "Linear Equations",
    correctAnswer: "C",
    difficulty: "Easy",
    graphData: null,
    desmosExpression: null,
    passageDomain: null,
  };
}

function startMockOpenAi() {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
      jsonResponse(res, 404, { error: "not_found" });
      return;
    }

    req.on("data", () => {});
    req.on("end", () => {
      openAiCallCount += 1;
      jsonResponse(res, 200, {
        id: `chatcmpl-critical-${openAiCallCount}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "mock",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: JSON.stringify({
                passage: null,
                questions: [mockQuestion(openAiCallCount)],
              }),
            },
          },
        ],
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(mockOpenAiPort, "127.0.0.1", () => resolve(server));
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${appBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

async function createUser(email, overrides = {}) {
  return prisma.user.create({
    data: {
      email,
      name: "Critical Guard",
      emailVerified: true,
      ...overrides,
    },
  });
}

async function createSessionCookie(userId) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });
  return `auth_session=${session.id}`;
}

function storedQuestion(id) {
  return {
    id,
    passage: null,
    question: `If ${id + 1}x + ${id + 2} = ${(id + 1) * 2 + id + 2}, what is the value of x?`,
    options: { A: "0", B: "1", C: "2", D: "3" },
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

async function createPracticeTest(userId, overrides = {}) {
  const count = overrides.count ?? 1;
  const questions = Array.from({ length: count }, (_, index) => storedQuestion(index + 1));
  return prisma.practiceTest.create({
    data: {
      userId,
      section: "math",
      topic: null,
      difficulty: null,
      questions: JSON.stringify(questions),
      passage: null,
      ...overrides.data,
    },
  });
}

async function append(cookie, testId, extra = {}) {
  return request("/api/generate-practice", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify({
      section: "math",
      questionCount: 1,
      existingTestId: testId,
      ...extra,
    }),
  });
}

function responseSummary(result) {
  return `status=${result.response.status} body=${JSON.stringify(result.body)}`;
}

async function readQuestionCount(testId) {
  const test = await prisma.practiceTest.findUniqueOrThrow({ where: { id: testId } });
  return JSON.parse(test.questions).length;
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "critical-guard-",
      },
    },
  });
}

async function run() {
  const mockServer = await startMockOpenAi();
  try {
    await cleanup();

    const practiceUser = await createUser("critical-guard-practice@example.com");
    const practiceCookie = await createSessionCookie(practiceUser.id);

    const completed = await createPracticeTest(practiceUser.id, {
      data: { completedAt: new Date() },
    });
    const beforeCompleted = openAiCallCount;
    const completedResult = await append(practiceCookie, completed.id);
    assert.equal(completedResult.response.status, 409, "completed tests reject appends");
    assert.equal(openAiCallCount, beforeCompleted, "completed append did not call OpenAI");

    const mismatched = await createPracticeTest(practiceUser.id, {
      data: { topic: "Linear Equations" },
    });
    const beforeMismatch = openAiCallCount;
    const mismatchResult = await append(practiceCookie, mismatched.id, { topic: "Quadratic Equations" });
    assert.equal(mismatchResult.response.status, 409, "config mismatches reject appends");
    assert.equal(openAiCallCount, beforeMismatch, "config mismatch did not call OpenAI");

    const capped = await createPracticeTest(practiceUser.id, { count: 50 });
    const beforeCap = openAiCallCount;
    const capResult = await append(practiceCookie, capped.id, { expectedQuestionOffset: 50 });
    assert.equal(capResult.response.status, 400, "over-cap appends reject");
    assert.equal(openAiCallCount, beforeCap, "over-cap append did not call OpenAI");

    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    previousMonth.setDate(1);
    previousMonth.setHours(0, 0, 0, 0);
    const oldTest = await createPracticeTest(practiceUser.id, {
      data: { createdAt: previousMonth },
    });
    const beforeOld = openAiCallCount;
    const oldResult = await append(practiceCookie, oldTest.id);
    assert.equal(oldResult.response.status, 402, "prior-month free-tier append rejects");
    assert.equal(openAiCallCount, beforeOld, "prior-month append did not call OpenAI");

    const replayTest = await createPracticeTest(practiceUser.id);
    const replayFirst = await append(practiceCookie, replayTest.id, { expectedQuestionOffset: 1 });
    assert.equal(
      replayFirst.response.status,
      200,
      `first expected-offset append succeeds (${responseSummary(replayFirst)})`
    );
    assert.equal(await readQuestionCount(replayTest.id), 2, "first append persists one question");
    const afterReplayFirstAiCalls = openAiCallCount;
    const replaySecond = await append(practiceCookie, replayTest.id, { expectedQuestionOffset: 1 });
    assert.equal(
      replaySecond.response.status,
      200,
      `retry with old offset replays persisted slice (${responseSummary(replaySecond)})`
    );
    assert.equal(openAiCallCount, afterReplayFirstAiCalls, "replay did not call OpenAI again");
    assert.equal(await readQuestionCount(replayTest.id), 2, "replay did not duplicate questions");

    const concurrentTest = await createPracticeTest(practiceUser.id);
    const [appendA, appendB] = await Promise.all([
      append(practiceCookie, concurrentTest.id),
      append(practiceCookie, concurrentTest.id),
    ]);
    assert.equal(
      appendA.response.status,
      200,
      `first concurrent append succeeds (${responseSummary(appendA)})`
    );
    assert.equal(
      appendB.response.status,
      200,
      `second concurrent append succeeds (${responseSummary(appendB)})`
    );
    assert.equal(await readQuestionCount(concurrentTest.id), 3, "concurrent appends preserve both writes");

    const passwordless = await createUser("critical-guard-passwordless@example.com", {
      passwordHash: null,
    });
    const takeover = await request("/api/auth/register", {
      method: "POST",
      headers: { Origin: appBaseUrl },
      body: JSON.stringify({
        email: passwordless.email,
        name: "Attacker",
        password: "correct horse battery staple",
        termsAccepted: true,
      }),
    });
    assert.equal(takeover.response.status, 409, "unauthenticated passwordless migration is blocked");
    const unchangedPasswordless = await prisma.user.findUniqueOrThrow({ where: { id: passwordless.id } });
    assert.equal(unchangedPasswordless.passwordHash, null, "blocked migration does not set a password");

    const subscriber = await createUser("critical-guard-subscriber@example.com", {
      stripeCustomerId: "cus_critical_guard",
      stripeSubscriptionId: "sub_critical_guard",
      subscriptionStatus: "ACTIVE",
    });
    const subscriberCookie = await createSessionCookie(subscriber.id);
    const deleteActive = await request("/api/auth/delete", {
      method: "DELETE",
      headers: { Cookie: subscriberCookie },
    });
    assert.equal(deleteActive.response.status, 409, "active subscriber deletion fails closed without Stripe");
    assert.ok(
      await prisma.user.findUnique({ where: { id: subscriber.id } }),
      "subscriber remains when deletion is blocked"
    );

    const exportUser = await createUser("critical-guard-export@example.com", {
      skillWeaknesses: { "Linear Equations": { attempts: 1, misses: 0 } },
      seenQuestionFingerprints: JSON.stringify(["fingerprint-1"]),
    });
    await createPracticeTest(exportUser.id);
    await prisma.studyPlan.create({
      data: { userId: exportUser.id, plan: JSON.stringify({ title: "Export Plan" }) },
    });
    await prisma.microLesson.create({
      data: { userId: exportUser.id, topic: "Linear Equations", lesson: JSON.stringify({ title: "Export Lesson" }) },
    });
    const exportCookie = await createSessionCookie(exportUser.id);
    const exported = await request("/api/auth/export", {
      headers: { Cookie: exportCookie },
    });
    assert.equal(exported.response.status, 200, "authenticated export succeeds");
    assert.equal(exported.body.practiceTests.length, 1, "export includes practice tests");
    assert.equal(exported.body.studyPlans.length, 1, "export includes study plans");
    assert.equal(exported.body.microLessons.length, 1, "export includes micro-lessons");
    assert.deepEqual(
      exported.body.account.skillWeaknesses,
      { "Linear Equations": { attempts: 1, misses: 0 } },
      "export includes skill weaknesses"
    );

    console.log("critical guard regression checks passed");
  } finally {
    await cleanup();
    await prisma.$disconnect();
    await new Promise((resolve) => mockServer.close(resolve));
  }
}

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
