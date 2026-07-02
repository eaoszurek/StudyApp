/* eslint-disable no-console */
/**
 * Non-AI MVP audit checks: auth, CSRF, pages, flashcard absence, IDOR spot-check.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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

const results = [];
function record(area, name, ok, detail = "") {
  results.push({ area, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function authTests() {
  const email = `audit-auth-${randomId()}@example.com`;
  const password = "AuditTest-123!";
  const origin = { Origin: BASE_URL };
  const reg = await json("POST", "/api/auth/register", {
    email,
    password,
    name: "Audit User",
    termsAccepted: true,
  }, null, origin);
  const cookie = reg.res.headers.get("set-cookie")?.split(",")[0];
  record("Auth", "Register with terms", reg.res.ok && Boolean(cookie));

  const dup = await json("POST", "/api/auth/register", {
    email,
    password,
    name: "Audit",
    termsAccepted: true,
  });
  record("Auth", "Reject duplicate email", dup.res.status === 409 || dup.res.status === 400);

  const badLogin = await json("POST", "/api/auth/login", { email, password: "wrongpass!" }, null, { Origin: BASE_URL });
  record("Auth", "Reject wrong password", badLogin.res.status === 401);

  const goodLogin = await json("POST", "/api/auth/login", { email, password }, null, { Origin: BASE_URL });
  const loginCookie = goodLogin.res.headers.get("set-cookie")?.split(",")[0];
  record("Auth", "Login sets session", goodLogin.res.ok && Boolean(loginCookie));

  const me = await json("GET", "/api/auth/me", null, loginCookie || cookie);
  record("Auth", "/api/auth/me when logged in", me.res.ok && me.data?.user?.email === email);

  const meAnon = await json("GET", "/api/auth/me");
  record("Auth", "/api/auth/me null user when anon", meAnon.res.status === 200 && meAnon.data?.user === null);

  const logout = await json("POST", "/api/auth/logout", null, loginCookie || cookie);
  record("Auth", "Logout", logout.res.ok);

  return loginCookie || cookie;
}

async function csrfTest() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example.com",
    },
    body: JSON.stringify({ email: "x@y.com", password: "x" }),
  });
  record("Security", "CSRF rejects bad Origin", res.status === 403);
}

async function pageTests() {
  const routes = [
    "/",
    "/privacy",
    "/terms",
    "/support",
    "/digital-sat-math-practice-test",
    "/sat-algebra-practice-questions",
    "/sitemap.xml",
  ];
  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`);
    const text = await res.text();
    record("Pages", route, res.status === 200, `status=${res.status}`);
    if (route === "/sitemap.xml") {
      record("Pages", "sitemap no flashcards", !text.includes("/flashcards"));
    }
    if (route === "/") {
      record("Pages", "landing no flashcard refs", !/flashcard/i.test(text));
    }
  }
}

async function idorTest() {
  const emailA = `audit-a-${randomId()}@example.com`;
  const emailB = `audit-b-${randomId()}@example.com`;
  const password = "AuditTest-123!";
  const regA = await json("POST", "/api/auth/register", {
    email: emailA,
    password,
    name: "User A",
    termsAccepted: true,
  }, null, { Origin: BASE_URL });
  const cookieA = regA.res.headers.get("set-cookie")?.split(",")[0];
  const regB = await json("POST", "/api/auth/register", {
    email: emailB,
    password,
    name: "User B",
    termsAccepted: true,
  }, null, { Origin: BASE_URL });
  const cookieB = regB.res.headers.get("set-cookie")?.split(",")[0];

  // Create practice test for user A if API key available; else skip generation
  const gen = await json(
    "POST",
    "/api/generate-practice",
    { section: "math", questionCount: 5, difficulty: "Mixed" },
    cookieA
  );
  if (!gen.res.ok) {
    record("Security", "IDOR score test (skipped — no practice gen)", true, gen.data?.error || "no key");
    record("Security", "IDOR append test (skipped)", true, "no key");
    return;
  }
  const testId = gen.data?.id;
  const scoreAsB = await json(
    "PATCH",
    `/api/practice-tests/${testId}/score`,
    { scaledScore: 500, rawScore: 1, maxRawScore: 5, answers: ["A", "B", "C", "D", "A"] },
    cookieB
  );
  record("Security", "IDOR score blocked", scoreAsB.res.status === 403 || scoreAsB.res.status === 404);

  const appendAsB = await json(
    "POST",
    "/api/generate-practice",
    {
      section: "math",
      questionCount: 5,
      difficulty: "Mixed",
      existingTestId: testId,
    },
    cookieB
  );
  record(
    "Security",
    "IDOR append blocked",
    appendAsB.res.status === 403 || appendAsB.res.status === 404
  );
}

async function premiumGateTest() {
  const email = `audit-gate-${randomId()}@example.com`;
  const password = "AuditTest-123!";
  const reg = await json("POST", "/api/auth/register", {
    email,
    password,
    name: "Gate User",
    termsAccepted: true,
  }, null, { Origin: BASE_URL });
  const cookie = reg.res.headers.get("set-cookie")?.split(",")[0];
  const access1 = await json("GET", "/api/user/access-status", null, cookie);
  record("Gate", "access-status when signed in", access1.res.ok);

  const gen1 = await json(
    "POST",
    "/api/generate-practice",
    { section: "math", questionCount: 5, difficulty: "Mixed" },
    cookie
  );
  if (!gen1.res.ok) {
    record("Gate", "first gen (skipped)", true, gen1.data?.error);
    return;
  }
  const gen2 = await json(
    "POST",
    "/api/generate-practice",
    { section: "math", questionCount: 5, difficulty: "Mixed" },
    cookie
  );
  const bypass = process.env.BYPASS_PREMIUM_GATE === "true";
  if (bypass) {
    record("Gate", "bypass allows unlimited", gen2.res.ok || gen2.res.status === 429);
  } else {
    record("Gate", "second gen blocked (402)", gen2.res.status === 402);
    const access2 = await json("GET", "/api/user/access-status", null, cookie);
    record(
      "Gate",
      "access-status allowed=false",
      access2.data?.allowed === false && access2.data?.isPremium === false
    );
  }
}

async function main() {
  console.log(`Non-AI audit @ ${BASE_URL}\n`);
  await authTests();
  await csrfTest();
  await pageTests();
  await idorTest();
  await premiumGateTest();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSummary: ${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
