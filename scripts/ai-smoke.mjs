/* eslint-disable no-console */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ISOLATE_USERS = process.env.SMOKE_ISOLATE_USERS === "true";
const REQUEST_RETRIES = Number(process.env.SMOKE_REQUEST_RETRIES || "1");

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function truncate(value, len = 220) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > len ? `${text.slice(0, len)}...` : text;
}

async function fetchJson(path, payload, cookie) {
  const started = Date.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(payload),
  });

  const elapsedMs = Date.now() - started;
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = { parseError: "Failed to parse JSON response" };
  }

  return { response, body, elapsedMs };
}

async function createSessionCookie() {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const email = `smoke-${randomId()}@example.com`;
    const password = `SmokeTest-${randomId()}!`;
    const name = "Smoke Tester";

    const register = await fetchJson(
      "/api/auth/register",
      { email, password, name, termsAccepted: true },
      null
    );

    if (register.response.ok) {
      const setCookie =
        register.response.headers.get("set-cookie") ||
        register.response.headers.get("Set-Cookie");
      if (!setCookie) {
        throw new Error("No session cookie returned by register endpoint.");
      }
      return setCookie.split(",")[0];
    }

    if (register.response.status === 429 && attempt < 4) {
      const retryAfter = Number(register.response.headers.get("retry-after") || "15");
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      continue;
    }

    throw new Error(
      `Failed to create smoke-test user (${register.response.status}): ${truncate(
        register.body
      )}`
    );
  }

  throw new Error("Unable to create smoke-test user after retries.");
}

function evaluate(endpoint, result) {
  if (!result.response.ok) {
    return {
      ok: false,
      reason: `HTTP ${result.response.status}: ${truncate(result.body?.error || result.body)}`,
    };
  }

  const body = result.body;
  switch (endpoint) {
    case "/api/generate-question":
      if (!Array.isArray(body?.questions) || body.questions.length < 5) {
        return { ok: false, reason: "Expected >=5 questions." };
      }
      return { ok: true };
    case "/api/ai/lessons":
      if (!Array.isArray(body?.practice) || body.practice.length < 1) {
        return { ok: false, reason: "Expected lesson practice questions." };
      }
      return { ok: true };
    case "/api/generate-flashcards":
      if (!Array.isArray(body?.flashcards) || body.flashcards.length < 8) {
        return { ok: false, reason: "Expected >=8 flashcards." };
      }
      return { ok: true };
    case "/api/generate-practice":
      if (!Array.isArray(body?.questions) || body.questions.length < 5) {
        return { ok: false, reason: "Expected >=5 practice questions." };
      }
      return { ok: true };
    case "/api/generate-personalized-plan":
      if (!Array.isArray(body?.dailyPlan) || body.dailyPlan.length < 3) {
        return { ok: false, reason: "Expected study plan daily entries." };
      }
      return { ok: true };
    case "/api/generate-plan":
      if (!Array.isArray(body?.categories) || body.categories.length < 1) {
        return { ok: false, reason: "Expected plan categories." };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

async function run() {
  const tests = [
    {
      endpoint: "/api/generate-question",
      payload: { topic: "Transitions and logical flow" },
    },
    {
      endpoint: "/api/ai/lessons",
      payload: { topic: "Linear equations in one variable", difficulty: "easy" },
    },
    {
      endpoint: "/api/generate-flashcards",
      payload: { topic: "Independent and dependent clauses" },
    },
    {
      endpoint: "/api/generate-practice",
      payload: { section: "writing", questionCount: 5, difficulty: "Mixed" },
    },
    {
      endpoint: "/api/generate-personalized-plan",
      payload: {
        answers: {
          targetScore: "1450+",
          testDate: "3 months",
          weakestSection: "Writing",
          hoursPerDay: "1-2 hours",
          studyStyle: "Structured and guided",
          workloadPreference: "Balanced",
          confidenceLevel: "Need a stronger foundation first",
          notes: "Focus on grammar and pacing.",
        },
        performanceData: {
          averageScore: 1180,
          totalSessions: 6,
          weakestSection: "Writing",
        },
      },
    },
    {
      endpoint: "/api/generate-plan",
      payload: { subject: "Digital SAT Prep" },
    },
  ];

  const results = [];
  let sharedCookie = null;
  for (const test of tests) {
    if (ISOLATE_USERS) {
      sharedCookie = await createSessionCookie();
    } else if (!sharedCookie) {
      sharedCookie = await createSessionCookie();
    }

    let result = null;
    let check = { ok: false, reason: "No attempt executed" };
    for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
      result = await fetchJson(test.endpoint, test.payload, sharedCookie);
      check = evaluate(test.endpoint, result);
      if (check.ok) break;
    }

    results.push({
      endpoint: test.endpoint,
      status: result.response.status,
      ms: result.elapsedMs,
      ok: check.ok,
      reason: check.ok ? "" : check.reason,
    });
    console.log(
      `${check.ok ? "PASS" : "FAIL"} ${test.endpoint} (${result.response.status}) ${result.elapsedMs}ms${
        check.reason ? ` | ${check.reason}` : ""
      }`
    );
  }

  const failed = results.filter((r) => !r.ok);
  const avgMs = Math.round(
    results.reduce((sum, r) => sum + r.ms, 0) / Math.max(1, results.length)
  );
  console.log("\nSummary:");
  console.log(`- Total: ${results.length}`);
  console.log(`- Passed: ${results.length - failed.length}`);
  console.log(`- Failed: ${failed.length}`);
  console.log(`- Average latency: ${avgMs}ms`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`Smoke test runner failed: ${error.message}`);
  process.exitCode = 1;
});
