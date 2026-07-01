/* eslint-disable no-console */
/**
 * Practice generation quality gate: SAT style, no repeats, ≤60s for 5 questions.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const MAX_MS_5Q = Number(process.env.PRACTICE_5Q_MAX_MS || 60000);

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function registerCookie() {
  const email = `pq-${randomId()}@example.com`;
  const password = `SmokeTest-${randomId()}!`;
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "PQ Test", termsAccepted: true }),
  });
  const setCookie = res.headers.get("set-cookie") || res.headers.get("Set-Cookie");
  if (!res.ok || !setCookie) {
    throw new Error(`Register failed ${res.status}`);
  }
  return setCookie.split(",")[0];
}

function normalizeStem(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a, b) {
  const sa = new Set(normalizeStem(a).split(" ").filter(Boolean));
  const sb = new Set(normalizeStem(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function hasFourOptions(q) {
  const opts = q.options;
  if (!opts) return false;
  if (Array.isArray(opts)) return opts.filter(Boolean).length === 4;
  return ["A", "B", "C", "D"].every((k) => String(opts[k] || "").trim());
}

function likelySatMath(q) {
  const text = String(q.question || "");
  if (text.length < 15) return false;
  return (
    /[0-9=+\-*/^%]/.test(text) ||
    /\b(value|equation|function|satisfies|graph|percent|ratio|linear|system)\b/i.test(text)
  );
}

function likelySatRw(q) {
  const text = String(q.question || "");
  const passage = String(q.passage || "");
  if (text.length < 15) return false;
  if (passage.length < 40) return false;
  return /\b(which|what|author|passage|choice|best|supports|transition|sentence|replace)\b/i.test(text);
}

function analyzeSet(questions, section, topicLocked = false) {
  const issues = [];
  const stems = [];
  const skills = [];
  const passages = [];

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!hasFourOptions(q)) issues.push(`Q${i + 1}: missing 4 options`);
    const satOk = section === "math" ? likelySatMath(q) : likelySatRw(q);
    if (!satOk) issues.push(`Q${i + 1}: weak SAT-style signal`);
    stems.push(q.question || "");
    skills.push(String(q.skillCategory || q.skillFocus || "").toLowerCase());
    if (q.passage) passages.push(q.passage);
  }

  for (let i = 0; i < stems.length; i += 1) {
    for (let j = i + 1; j < stems.length; j += 1) {
      if (jaccard(stems[i], stems[j]) >= 0.82) {
        issues.push(`Near-duplicate stems Q${i + 1}/Q${j + 1}`);
      }
      if (!topicLocked && skills[i] && skills[i] === skills[j]) {
        issues.push(`Repeated skill "${skills[i]}" on Q${i + 1}/Q${j + 1}`);
      }
    }
  }

  // R&W sets share one passage per block — only flag if passages differ but are near-identical.
  if (section !== "reading-writing") {
    for (let i = 0; i < passages.length; i += 1) {
      for (let j = i + 1; j < passages.length; j += 1) {
        if (jaccard(passages[i], passages[j]) >= 0.85) {
          issues.push(`Near-duplicate passage ${i + 1}/${j + 1}`);
        }
      }
    }
  } else if (passages.length > 1) {
    const uniquePassages = new Set(passages.map((p) => normalizeStem(p).slice(0, 120)));
    if (uniquePassages.size > 1) {
      issues.push("R&W set has multiple distinct passages (expected one shared passage)");
    }
  }

  return issues;
}

async function runCase(label, payload) {
  const cookie = await registerCookie();
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/generate-practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  });
  const elapsedMs = Date.now() - t0;
  const body = await res.json();
  const questions = Array.isArray(body?.questions) ? body.questions : [];
  const count = payload.questionCount;
  const issues = analyzeSet(questions, payload.section, Boolean(payload.topic));
  const timeOk = count <= 5 ? elapsedMs <= MAX_MS_5Q : elapsedMs <= 180000;
  const countOk = questions.length >= count;
  const ok = res.ok && countOk && timeOk && issues.length === 0;

  console.log(`\n--- ${label} ---`);
  console.log(`${ok ? "PASS" : "FAIL"} status=${res.status} count=${questions.length}/${count} time=${elapsedMs}ms`);
  if (!res.ok) console.log("Error:", body?.error || body);
  if (body?.partialWarning) console.log("Partial:", body.partialWarning);
  if (!timeOk) console.log(`Timing: exceeded ${count <= 5 ? MAX_MS_5Q : 180000}ms budget`);
  if (issues.length) console.log("Quality:", issues.join("; "));

  return { ok, elapsedMs, issues, count: questions.length };
}

async function main() {
  const cases = [
    ["5Q Math Mixed", { section: "math", questionCount: 5, difficulty: "Mixed" }],
    ["5Q Math Linear Equations", { section: "math", questionCount: 5, topic: "Linear Equations", difficulty: "Mixed" }],
    ["5Q Reading-Writing Mixed", { section: "reading-writing", questionCount: 5, difficulty: "Mixed" }],
  ];

  const results = [];
  for (const [label, payload] of cases) {
    results.push(await runCase(label, payload));
  }

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
