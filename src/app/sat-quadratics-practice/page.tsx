import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function SatQuadraticsPracticePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          SAT Quadratics Practice
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          Quadratics show up throughout the Digital SAT math section under Passport to Advanced Math. Whether you’re factoring, using the quadratic formula, or interpreting a parabola, practice here builds the fluency you need. This guide covers what’s tested and how to improve with SAT quadratics practice.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Are Quadratics on the SAT?</h2>
            <p className="leading-relaxed mb-3">
              Quadratic expressions and equations involve x². You’ll solve quadratic equations (often by factoring or the quadratic formula), find roots or vertex, and connect equations to their graphs. The SAT also tests equivalent forms—for example, going between standard form and factored form.
            </p>
            <p className="leading-relaxed">
              Questions can be purely algebraic or tied to a parabola’s graph. Being comfortable with both the algebra and the graph is key.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Quadratics Matter on the Digital SAT</h2>
            <p className="leading-relaxed mb-3">
              Passport to Advanced Math is a major part of the section, and quadratics are central to it. Doing well here helps your overall math score and prepares you for the harder second module if the test adapts up.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Solving quadratic equations (factoring, quadratic formula)</li>
              <li>Vertex form and standard form of a parabola</li>
              <li>Roots, zeros, and x-intercepts</li>
              <li>Word problems that lead to quadratic equations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Mistakes on Quadratic Questions</h2>
            <p className="leading-relaxed mb-3">
              These slip-ups cost points. Watch for them when you practice.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Sign errors in the quadratic formula.</strong> It’s x = (−b ± √(b² − 4ac)) / (2a). Keep the minus in front of b and the 4ac inside the radical.</li>
              <li><strong className="text-slate-900">Factoring mistakes.</strong> Check that your factors multiply back to the original. Write out the product before you move on.</li>
              <li><strong className="text-slate-900">Vertex vs. roots.</strong> The vertex is the turning point; the roots are where the graph hits the x-axis. Don’t confuse what the question is asking for.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example SAT Quadratics Practice</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1</p>
              <p className="mb-2">Solve x² − 5x + 6 = 0.</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Factor: (x − 2)(x − 3) = 0, so x = 2 or x = 3.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2</p>
              <p className="mb-2">For y = x² − 4x + 3, what are the x-intercepts?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Set y = 0: x² − 4x + 3 = 0. Factor: (x − 1)(x − 3) = 0, so x = 1 and x = 3. The x-intercepts are 1 and 3.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Tips to Improve at SAT Quadratics</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Know when to factor vs. use the quadratic formula. If the quadratic factors nicely, factoring is usually faster. If it doesn’t, use the formula.</li>
              <li>Practice going between forms: standard (ax² + bx + c), factored a(x − r)(x − s), and vertex form. The SAT often asks for equivalent expressions.</li>
              <li>After each practice question, note which method you used so you build pattern recognition.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How many quadratic questions are on the Digital SAT?</dt>
                <dd className="text-slate-700">Quadratics are part of Passport to Advanced Math, which is about 35% of the math section. You’ll see several quadratic-related questions per test.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Do I need to memorize the quadratic formula?</dt>
                <dd className="text-slate-700">Yes. It’s not on the reference sheet. Memorize x = (−b ± √(b² − 4ac)) / (2a) and practice using it so you don’t make sign errors.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">What’s the best way to practice SAT quadratics?</dt>
                <dd className="text-slate-700">Do SAT-style questions that mix factoring, the formula, and graphs. Focus on clean setup and avoiding sign and arithmetic errors.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Raise Your Score With SAT Quadratics Practice</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get quadratics and full math practice that matches the Digital SAT, with instant explanations.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Practice by topic—factoring, quadratic formula, parabolas</li>
              <li>Step-by-step explanations for every question</li>
              <li>Free to start—no credit card required</li>
            </ul>
            <Link href="/">
              <PrimaryButton>Start free SAT practice</PrimaryButton>
            </Link>
          </section>
        </article>
      </div>
    </main>
  );
}
