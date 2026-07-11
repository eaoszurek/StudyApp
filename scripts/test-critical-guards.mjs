/* eslint-disable no-console */
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
const MOCK_OPENAI_PORT = Number(process.env.MOCK_OPENAI_PORT || 43117);
const adapter = new PrismaLibSql({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function cookieFor(sessionId) {
  return `auth_session=${sessionId}`;
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function priorMonthDate() {
  const d = monthStart();
  d.setMonth(d.getMonth() - 1);
  d.setDate(15);
  return d;
}

function storedQuestion(id, suffix = "") {
  return {
    id,
    question: `If the linear equation ${id}x + ${id + 2} = ${id * 3 + 2} is true, what is the value of x? ${suffix}`.trim(),
    options: { A: "1", B: "2", C: "3", D: "4" },
    correctAnswer: "C",
    section: "Math",
    skillCategory: "Linear Equations",
    skillFocus: "Linear Equations",
    difficulty: "Medium",
    graphData: null,
    desmosExpression: null,
    passage: null,
    explanation_correct: "Subtract the constant, then divide by the coefficient.",
    explanation_incorrect: {},
    strategy_tip: "",
  };
}

function modelQuestion(requestNumber, index) {
  const n = requestNumber * 100 + index + 3;
  const skills = [
    "Linear Equations",
    "Linear Functions",
    "Systems of Equations",
    "Ratios & Rates",
    "Percentages",
    "Quadratic Equations",
    "Data Interpretation",
    "Triangles",
    "Circles",
    "Statistics",
  ];
  return {
    _scratchpad: null,
    passage: null,
    question: `A classroom supply table follows the linear equation y = ${n}x + ${index + 2}. What is the value of y when x = 2 for item ${requestNumber}-${index}?`,
    options: [
      String(n + index),
      String(2 * n + index + 2),
      String(3 * n + index),
      String(4 * n + index),
    ],
    section: "Math",
    skillCategory: skills[index % skills.length],
    correctAnswer: "B",
    difficulty: "Medium",
    graphData: null,
    desmosExpression: null,
    passageDomain: null,
  };
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function json(method, path, body, cookie) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { res, body: await readJson(res) };
}

async function seedUser({ subscriptionStatus = null, passwordHash = "test-hash" } = {}) {
  const user = await prisma.user.create({
    data: {
      email: `critical-${randomId()}@example.com`,
      name: "Critical Guard User",
      passwordHash,
      emailVerified: true,
      subscriptionStatus,
    },
  });
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return { user, session, cookie: cookieFor(session.id) };
}

async function seedPracticeTest(userId, data = {}) {
  const count = data.count ?? 2;
  return prisma.practiceTest.create({
    data: {
      userId,
      section: data.section ?? "math",
      topic: data.topic ?? null,
      difficulty: data.difficulty ?? null,
      questions: JSON.stringify(Array.from({ length: count }, (_, idx) => storedQuestion(idx + 1))),
      passage: null,
      completedAt: data.completedAt ?? null,
      createdAt: data.createdAt ?? new Date(),
    },
  });
}

async function startMockOpenAI() {
  let calls = 0;
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }

      calls += 1;
      const requestNumber = calls;
      await new Promise((resolve) => setTimeout(resolve, 150));
      const questions = Array.from({ length: 10 }, (_, idx) => modelQuestion(requestNumber, idx));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: `chatcmpl-${requestNumber}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "mock-model",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: JSON.stringify({ passage: null, questions }),
              },
            },
          ],
        })
      );
    });
  });

  await new Promise((resolve) => server.listen(MOCK_OPENAI_PORT, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock OpenAI server did not bind to a TCP port");
  }
  return {
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    get calls() {
      return calls;
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function testPasswordlessTakeoverBlocked() {
  const email = `legacy-${randomId()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Legacy User",
      passwordHash: null,
      emailVerified: true,
    },
  });

  const attempt = await json("POST", "/api/auth/register", {
    email,
    name: "Attacker",
    password: "AttackPass-123!",
    termsAccepted: true,
  });

  const after = await prisma.user.findUnique({ where: { id: user.id } });
  record(
    "unauthenticated passwordless migration is blocked",
    attempt.res.status === 409 && after?.passwordHash === null,
    `status=${attempt.res.status}`
  );
}

async function testAppendPreflightGuards(mock) {
  const { user, cookie } = await seedUser();

  const completed = await seedPracticeTest(user.id, { completedAt: new Date() });
  const completedAppend = await json("POST", "/api/generate-practice", {
    section: "math",
    questionCount: 1,
    existingTestId: completed.id,
  }, cookie);
  record("completed practice append blocked", completedAppend.res.status === 409, `status=${completedAppend.res.status}`);

  const config = await seedPracticeTest(user.id, { section: "math" });
  const configAppend = await json("POST", "/api/generate-practice", {
    section: "reading-writing",
    questionCount: 1,
    existingTestId: config.id,
  }, cookie);
  record("config-mismatched append blocked", configAppend.res.status === 409, `status=${configAppend.res.status}`);

  const capped = await seedPracticeTest(user.id, { count: 49 });
  const capAppend = await json("POST", "/api/generate-practice", {
    section: "math",
    questionCount: 2,
    existingTestId: capped.id,
  }, cookie);
  record("over-cap append blocked", capAppend.res.status === 400, `status=${capAppend.res.status}`);

  const old = await seedPracticeTest(user.id, { createdAt: priorMonthDate() });
  const oldAppend = await json("POST", "/api/generate-practice", {
    section: "math",
    questionCount: 1,
    existingTestId: old.id,
  }, cookie);
  record("prior-month free append blocked", oldAppend.res.status === 402, `status=${oldAppend.res.status}`);

  record("preflight guards avoid OpenAI calls", mock.calls === 0, `calls=${mock.calls}`);
}

async function testConcurrentAppendPreservesBothBatches() {
  const { user, cookie } = await seedUser({ subscriptionStatus: "ACTIVE" });
  const test = await seedPracticeTest(user.id, { count: 2 });

  const payload = {
    section: "math",
    questionCount: 1,
    existingTestId: test.id,
  };
  const [first, second] = await Promise.all([
    json("POST", "/api/generate-practice", payload, cookie),
    json("POST", "/api/generate-practice", payload, cookie),
  ]);

  const updated = await prisma.practiceTest.findUnique({ where: { id: test.id } });
  const questions = JSON.parse(updated?.questions || "[]");
  const ids = questions.map((q) => q.id);
  const idsSequential = ids.every((id, idx) => id === idx + 1);
  record(
    "concurrent appends both return success",
    first.res.ok && second.res.ok,
    `statuses=${first.res.status},${second.res.status}`
  );
  record(
    "concurrent appends preserve both batches",
    questions.length === 4 && idsSequential,
    `count=${questions.length}, ids=${ids.join(",")}`
  );
}

async function main() {
  const mock = await startMockOpenAI();
  console.log(`Critical guard tests @ ${BASE_URL}`);
  console.log(`Mock OpenAI @ ${mock.baseURL}\n`);

  if (!process.env.OPENAI_BASE_URL?.startsWith(mock.baseURL)) {
    console.log("NOTE: set OPENAI_BASE_URL to the mock URL when starting the Next server for full local isolation.");
  }

  try {
    await testPasswordlessTakeoverBlocked();
    await testAppendPreflightGuards(mock);
    await testConcurrentAppendPreservesBothBatches();
  } finally {
    await mock.close();
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
