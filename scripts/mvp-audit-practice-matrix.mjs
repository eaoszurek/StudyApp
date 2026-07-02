/* eslint-disable no-console */
/**
 * Full practice generation matrix for MVP audit (Section 3).
 * Usage: BASE_URL=http://localhost:3000 node scripts/mvp-audit-practice-matrix.mjs
 * Optional: MATRIX_FILTER=M1,R1  MATRIX_SKIP_QUALITY=true
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ORIGIN = process.env.ORIGIN || BASE_URL;
const FILTER = process.env.MATRIX_FILTER
  ? new Set(process.env.MATRIX_FILTER.split(",").map((s) => s.trim()))
  : null;
const SKIP_QUALITY = process.env.MATRIX_SKIP_QUALITY === "true";

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function registerCookie() {
  const email = `audit-${randomId()}@example.com`;
  const password = `AuditTest-${randomId()}!`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ email, password, name: "Audit User", termsAccepted: true }),
    });
    const setCookie = res.headers.get("set-cookie") || res.headers.get("Set-Cookie");
    if (res.ok && setCookie) {
      return setCookie.split(",")[0];
    }
    if (res.status === 429 && attempt < 4) {
      const wait = Number(res.headers.get("retry-after") || "15") + 1;
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const body = await res.text();
    throw new Error(`Register failed ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error("Register failed after retries");
}

async function generatePractice(cookie, payload) {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/generate-practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, Origin: ORIGIN },
    body: JSON.stringify(payload),
  });
  const elapsedMs = Date.now() - t0;
  let body;
  try {
    body = await res.json();
  } catch {
    body = { parseError: true };
  }
  return { res, body, elapsedMs };
}

function normalizeStem(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/[^a-z0-9\s#]/g, " ")
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

function getOptions(q) {
  if (Array.isArray(q.options)) {
    return { A: q.options[0], B: q.options[1], C: q.options[2], D: q.options[3] };
  }
  return q.options || {};
}

function hasFourOptions(q) {
  const opts = getOptions(q);
  return ["A", "B", "C", "D"].every((k) => String(opts[k] || "").trim());
}

function likelySatMath(q) {
  const text = String(q.question || "");
  if (text.length < 15) return false;
  return (
    /[0-9=+\-*/%]/.test(text) ||
    /\b(value|equation|function|satisfies|graph|percent|ratio|linear|system|triangle|circle)\b/i.test(text)
  );
}

function likelySatRw(q, sharedPassage) {
  const text = String(q.question || "");
  const passage = String(q.passage || sharedPassage || "");
  if (text.length < 15) return false;
  if (passage.length < 40 && !/\b(which|what|author|passage|choice|best|supports|transition|sentence|replace|underlined|completes|describes)\b/i.test(text)) {
    return false;
  }
  return /\b(which|what|author|passage|choice|best|supports|transition|sentence|replace|underlined|completes|describes|structure|purpose|evidence)\b/i.test(text);
}

function scoreQuestion(q, section, sharedPassage) {
  const issues = [];
  if (!hasFourOptions(q)) issues.push("missing 4 options");
  const ca = q.correctAnswer;
  if (!["A", "B", "C", "D"].includes(ca)) issues.push("invalid correctAnswer");
  const stem = String(q.question || "");
  if (stem.length < 15) issues.push("stem too short");
  if (/\*\*|```/.test(stem)) issues.push("markdown artifacts");
  if (/\^/.test(stem)) issues.push("caret notation");
  const satOk = section === "math" ? likelySatMath(q) : likelySatRw(q, sharedPassage);
  if (!satOk) issues.push("weak SAT signal");
  return issues;
}

function analyzeSet(questions, section, topicLocked, sharedPassage) {
  const stripBoilerplate = (s) =>
    normalizeStem(s)
      .replace(/\bwhich choice\b/g, "choice")
      .replace(/\bbest states\b/g, "")
      .replace(/\bbest describes\b/g, "")
      .replace(/\bas used in the text\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const issues = [];
  const stems = [];
  for (let i = 0; i < questions.length; i += 1) {
    issues.push(...scoreQuestion(questions[i], section, sharedPassage).map((x) => `Q${i + 1}: ${x}`));
    stems.push(questions[i].question || "");
  }
  for (let i = 0; i < stems.length; i += 1) {
    for (let j = i + 1; j < stems.length; j += 1) {
      if (jaccard(stripBoilerplate(stems[i]), stripBoilerplate(stems[j])) >= 0.88) {
        issues.push(`Near-duplicate stems Q${i + 1}/Q${j + 1}`);
      }
    }
  }
  if (section !== "math" && sharedPassage && sharedPassage.length < 40) {
    issues.push("shared passage too short");
  }
  return issues;
}

function timeBudget(count, payload = {}) {
  const isHard = payload.difficulty === "Hard";
  if (count <= 5) return isHard ? 110000 : 90000;
  if (count <= 10) return 150000;
  return 210000;
}

const CASES = [
  { id: "M1", label: "5Q Mixed", payload: { section: "math", questionCount: 5, difficulty: "Mixed" } },
  { id: "M2", label: "5Q Easy", payload: { section: "math", questionCount: 5, difficulty: "Easy" } },
  { id: "M3", label: "5Q Medium", payload: { section: "math", questionCount: 5, difficulty: "Medium" } },
  { id: "M4", label: "5Q Hard", payload: { section: "math", questionCount: 5, difficulty: "Hard" } },
  { id: "M5", label: "5Q Linear Equations", payload: { section: "math", questionCount: 5, topic: "Linear Equations", difficulty: "Mixed" } },
  { id: "M6", label: "5Q Quadratics Hard", payload: { section: "math", questionCount: 5, topic: "Quadratic Equations", difficulty: "Hard" } },
  { id: "M7", label: "5Q Statistics", payload: { section: "math", questionCount: 5, topic: "Statistics", difficulty: "Mixed" } },
  { id: "M8", label: "5Q Trigonometry", payload: { section: "math", questionCount: 5, topic: "Trigonometry", difficulty: "Mixed" } },
  { id: "M9", label: "10Q Mixed", payload: { section: "math", questionCount: 10, difficulty: "Mixed" } },
  { id: "M10", label: "15Q Mixed", payload: { section: "math", questionCount: 15, difficulty: "Mixed" } },
  { id: "M11", label: "20Q Mixed", payload: { section: "math", questionCount: 20, difficulty: "Mixed" } },
  { id: "M12", label: "25Q Mixed", payload: { section: "math", questionCount: 25, difficulty: "Mixed" } },
  { id: "M13", label: "20Q Systems", payload: { section: "math", questionCount: 20, topic: "Systems of Equations", difficulty: "Mixed" } },
  { id: "R1", label: "5Q R&W Mixed", payload: { section: "reading-writing", questionCount: 5, difficulty: "Mixed" } },
  { id: "R2E", label: "5Q R&W Easy", payload: { section: "reading-writing", questionCount: 5, difficulty: "Easy" } },
  { id: "R2H", label: "5Q R&W Hard", payload: { section: "reading-writing", questionCount: 5, difficulty: "Hard" } },
  { id: "R3", label: "5Q Words in Context", payload: { section: "reading-writing", questionCount: 5, topic: "Words in Context", difficulty: "Mixed" } },
  { id: "R4", label: "5Q Command of Evidence", payload: { section: "reading-writing", questionCount: 5, topic: "Command of Evidence", difficulty: "Mixed" } },
  { id: "R5", label: "5Q Transitions", payload: { section: "reading-writing", questionCount: 5, topic: "Transitions", difficulty: "Mixed" } },
  { id: "R6", label: "5Q Sentence Boundaries", payload: { section: "reading-writing", questionCount: 5, topic: "Sentence Boundaries", difficulty: "Mixed" } },
  { id: "R7", label: "10Q R&W Mixed", payload: { section: "reading-writing", questionCount: 10, difficulty: "Mixed" } },
  { id: "R8", label: "20Q R&W Mixed", payload: { section: "reading-writing", questionCount: 20, difficulty: "Mixed" } },
  { id: "R9", label: "5Q legacy writing", payload: { section: "writing", questionCount: 5, difficulty: "Mixed" } },
];

async function runCase(testCase) {
  const { id, label, payload } = testCase;
  if (FILTER && !FILTER.has(id)) return null;

  const cookie = await registerCookie();
  const { res, body, elapsedMs } = await generatePractice(cookie, payload);
  const questions = Array.isArray(body?.questions) ? body.questions : [];
  const expected = payload.questionCount;
  const section = payload.section === "math" ? "math" : "reading-writing";
  const qualityIssues = SKIP_QUALITY
    ? []
    : analyzeSet(questions, section, Boolean(payload.topic), body?.passage);
  const budget = timeBudget(expected, payload);
  const countOk = questions.length >= expected;
  const timeOk = elapsedMs <= budget;
  const httpOk = res.ok;
  const status = httpOk && countOk && timeOk && qualityIssues.length === 0 ? "PASS" : "FAIL";

  const row = {
    id,
    label,
    status,
    timeMs: elapsedMs,
    http: res.status,
    count: `${questions.length}/${expected}`,
    issues: [
      !httpOk ? body?.error || `HTTP ${res.status}` : null,
      !countOk ? `count ${questions.length}/${expected}` : null,
      !timeOk ? `slow ${elapsedMs}ms > ${budget}ms` : null,
      ...qualityIssues,
    ].filter(Boolean).join("; "),
  };

  console.log(
    `${status} ${id} ${label} | ${res.status} | ${questions.length}/${expected} | ${elapsedMs}ms${
      row.issues ? ` | ${row.issues}` : ""
    }`
  );
  return row;
}

async function runProgressive(section, target = 20) {
  const id = section === "math" ? "P1-MATH" : "P1-RW";
  if (FILTER && !FILTER.has(id)) return null;

  const stripStem = (s) =>
    normalizeStem(s)
      .replace(/\bwhich choice\b/g, "choice")
      .replace(/\bbest\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const cookie = await registerCookie();
  const initial = await generatePractice(cookie, {
    section,
    questionCount: Math.min(2, target),
    difficulty: "Mixed",
  });
  const testId = initial.body?.id;
  let total = Array.isArray(initial.body?.questions) ? initial.body.questions.length : 0;
  const stems = (initial.body?.questions || []).map((q) => q.question || "");
  const batchTimes = [initial.elapsedMs];
  let failed = !initial.res.ok || !testId || total < 1;

  while (!failed && total < target) {
    const batch = await generatePractice(cookie, {
      section,
      questionCount: Math.min(5, target - total),
      difficulty: "Mixed",
      existingTestId: testId,
    });
    batchTimes.push(batch.elapsedMs);
    if (!batch.res.ok) {
      failed = true;
      break;
    }
    const newQs = batch.body?.questions || [];
    if (newQs.length === 0) {
      failed = true;
      break;
    }
    for (const q of newQs) {
      for (const s of stems) {
        if (jaccard(stripStem(s), stripStem(q.question || "")) >= 0.9) failed = true;
      }
      stems.push(q.question || "");
    }
    total += newQs.length;
    if (batch.elapsedMs > 150000) failed = true;
  }

  const status = !failed && total >= target ? "PASS" : "FAIL";
  const row = {
    id,
    label: `Progressive ${target}Q ${section}`,
    status,
    timeMs: batchTimes.reduce((a, b) => a + b, 0),
    http: initial.res.status,
    count: `${total}/${target}`,
    issues: failed
      ? `progressive incomplete or slow; batches=${batchTimes.length}`
      : "",
  };
  console.log(`${status} ${id} | total=${total}/${target} | batches=${batchTimes.length}`);
  return row;
}

async function runRepetition() {
  const id = "REP1";
  if (FILTER && !FILTER.has(id)) return null;

  const cookie = await registerCookie();
  const payload = { section: "math", questionCount: 5, topic: "Linear Equations", difficulty: "Mixed" };
  const first = await generatePractice(cookie, payload);
  const second = await generatePractice(cookie, payload);
  const stems1 = (first.body?.questions || []).map((q) => q.question || "");
  const stems2 = (second.body?.questions || []).map((q) => q.question || "");
  if (!second.res.ok && second.res.status === 402) {
    console.log(`SKIP ${id} | premium gate blocks second session on production`);
    return { id, label: "Cross-session repetition", status: "SKIP", timeMs: first.elapsedMs, http: first.res.status, count: "n/a", issues: "402 without BYPASS_PREMIUM_GATE" };
  }
  let repeats = 0;
  for (const s1 of stems1) {
    for (const s2 of stems2) {
      if (jaccard(s1, s2) >= 0.82) repeats += 1;
    }
  }
  const status = first.res.ok && second.res.ok && repeats === 0 ? "PASS" : "FAIL";
  const row = {
    id,
    label: "Cross-session repetition",
    status,
    timeMs: first.elapsedMs + second.elapsedMs,
    http: first.res.status,
    count: `repeats=${repeats}`,
    issues: repeats ? `${repeats} near-duplicate stems across sessions` : "",
  };
  console.log(`${status} ${id} | repeats=${repeats}`);
  return row;
}

async function main() {
  console.log(`Practice matrix @ ${BASE_URL}\n`);
  const rows = [];

  for (const testCase of CASES) {
    rows.push(await runCase(testCase));
  }
  rows.push(await runProgressive("math", 20));
  rows.push(await runProgressive("reading-writing", 20));
  rows.push(await runRepetition());

  const results = rows.filter(Boolean);
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.log(`\nSummary: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP / ${results.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
