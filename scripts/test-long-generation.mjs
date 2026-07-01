/* eslint-disable no-console */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function addMonthsYmd(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function planStartYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function registerCookie() {
  const email = `longtest-${randomId()}@example.com`;
  const password = `SmokeTest-${randomId()}!`;
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Long Test", termsAccepted: true }),
  });
  const setCookie = res.headers.get("set-cookie") || res.headers.get("Set-Cookie");
  if (!res.ok || !setCookie) {
    const body = await res.text();
    throw new Error(`Register failed ${res.status}: ${body.slice(0, 300)}`);
  }
  return setCookie.split(",")[0];
}

async function post(path, payload, cookie) {
  const started = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const elapsedMs = Date.now() - started;
  let body;
  try {
    body = await res.json();
  } catch {
    body = { parseError: true };
  }
  return { res, body, elapsedMs };
}

async function main() {
  console.log("--- Test 1: 20-question Math practice (Mixed) ---");
  const practiceCookie = await registerCookie();
  const practice = await post(
    "/api/generate-practice",
    {
      section: "math",
      questionCount: 20,
      topic: "Linear Equations",
      difficulty: "Mixed",
    },
    practiceCookie
  );
  const qCount = Array.isArray(practice.body?.questions) ? practice.body.questions.length : 0;
  console.log(
    `${practice.res.ok && qCount >= 20 ? "PASS" : "FAIL"} status=${practice.res.status} questions=${qCount}/20 time=${practice.elapsedMs}ms`
  );
  if (!practice.res.ok) {
    console.log("Error:", practice.body?.error || practice.body);
  }
  if (practice.body?.partialWarning) {
    console.log("Warning:", practice.body.partialWarning);
  }

  console.log("\n--- Test 2: 4-month study plan (fresh user) ---");
  const planCookie = await registerCookie();
  const testDate = addMonthsYmd(4);
  const plan = await post(
    "/api/generate-personalized-plan",
    {
      planStartDate: planStartYmd(),
      answers: {
        targetScore: "1400",
        testDate,
        weakestSection: "Math",
        hoursPerDay: "1 hour",
        studyStyle: "Short daily sessions",
        workloadPreference: "Balanced all week",
        confidenceLevel: "Mixed confidence",
        notes: "Focus on algebra.",
      },
      performanceData: {
        averageScore: 1100,
        totalSessions: 3,
        weakestSection: "Math",
      },
    },
    planCookie
  );
  const weekly = Array.isArray(plan.body?.weeklyPlan) ? plan.body.weeklyPlan.length : 0;
  const calWeeks = Number(plan.body?.calendarWeekCount) || 0;
  const detailWeeks = plan.body?.generatedDetailWeekCount ?? "?";
  const planOk = plan.res.ok && weekly >= Math.max(12, calWeeks - 1);
  console.log(
    `${planOk ? "PASS" : "FAIL"} status=${plan.res.status} weekly=${weekly} calendarWeeks=${calWeeks} detailWeeks=${detailWeeks} time=${plan.elapsedMs}ms testDate=${testDate}`
  );
  if (!plan.res.ok) {
    console.log("Error:", plan.body?.error || plan.body);
  }

  const failed = !practice.res.ok || qCount < 20 || !planOk;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
