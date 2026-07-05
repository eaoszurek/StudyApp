import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function resolveLibSqlConfig() {
  const rawUrl = process.env.DATABASE_URL || "file:./dev.db";
  const envToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (rawUrl.startsWith("libsql://")) {
    try {
      const parsed = new URL(rawUrl);
      const queryToken = parsed.searchParams.get("authToken")?.trim();
      if (queryToken) {
        parsed.searchParams.delete("authToken");
        return { url: parsed.toString(), authToken: envToken || queryToken };
      }
    } catch {
      // Fall through to the raw URL.
    }
    if (envToken) return { url: rawUrl, authToken: envToken };
  }

  return { url: rawUrl, authToken: envToken || undefined };
}

const prisma = new PrismaClient({
  adapter: new PrismaLibSql(resolveLibSqlConfig()),
});

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function sampleQuestions(count) {
  return Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    passage: null,
    question: `What is ${idx + 1} + ${idx + 2}?`,
    options: {
      A: String(idx + 2),
      B: String(idx + 3),
      C: String(idx + 4),
      D: String(idx + 5),
    },
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

async function json(method, path, body, cookie, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function registerUser() {
  const email = `append-guards-${randomId()}@example.com`;
  const password = "AuditTest-123!";
  const reg = await json(
    "POST",
    "/api/auth/register",
    { email, password, name: "Append Guard User", termsAccepted: true },
    null,
    { Origin: BASE_URL }
  );
  const cookie = reg.res.headers.get("set-cookie")?.split(",")[0];
  if (!reg.res.ok || !cookie) {
    throw new Error(`Register failed ${reg.res.status}: ${JSON.stringify(reg.data)}`);
  }

  const me = await json("GET", "/api/auth/me", null, cookie);
  const userId = me.data?.user?.id;
  if (!me.res.ok || !userId) {
    throw new Error(`Failed to read session user ${me.res.status}: ${JSON.stringify(me.data)}`);
  }

  return { cookie, userId };
}

async function createPracticeTest(userId, overrides = {}) {
  const questionCount = overrides.questionCount ?? 2;
  return prisma.practiceTest.create({
    data: {
      userId,
      section: overrides.section ?? "math",
      topic: overrides.topic ?? null,
      difficulty: overrides.difficulty ?? null,
      questions: JSON.stringify(sampleQuestions(questionCount)),
      passage: null,
      completedAt: overrides.completedAt ?? null,
      createdAt: overrides.createdAt ?? new Date(),
    },
  });
}

function previousMonthDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(15);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function expectAppendStatus(name, cookie, testId, payload, expectedStatus) {
  const result = await json(
    "POST",
    "/api/generate-practice",
    {
      section: "math",
      questionCount: 1,
      difficulty: "Mixed",
      existingTestId: testId,
      ...payload,
    },
    cookie,
    { Origin: BASE_URL }
  );
  const ok = result.res.status === expectedStatus;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: status=${result.res.status}, expected=${expectedStatus}`);
  if (!ok) {
    console.log("Response:", result.data);
  }
  return ok;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Start the app with a dummy key for guard-only tests.");
  }

  const { cookie, userId } = await registerUser();
  const completed = await createPracticeTest(userId, { completedAt: new Date() });
  const mismatched = await createPracticeTest(userId, { topic: "Linear Equations" });
  const capped = await createPracticeTest(userId, { questionCount: 50 });
  const priorMonth = await createPracticeTest(userId, { createdAt: previousMonthDate() });

  const results = [];
  results.push(await expectAppendStatus("completed tests cannot be appended", cookie, completed.id, {}, 409));
  results.push(
    await expectAppendStatus(
      "append config must match original topic",
      cookie,
      mismatched.id,
      { topic: "Quadratic Equations" },
      400
    )
  );
  results.push(await expectAppendStatus("50-question cap blocks append", cookie, capped.id, {}, 400));
  results.push(await expectAppendStatus("prior-month free-tier append blocked", cookie, priorMonth.id, {}, 402));

  await prisma.$disconnect();

  if (results.some((ok) => !ok)) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
