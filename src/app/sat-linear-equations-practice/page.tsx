import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function SatLinearEquationsPracticePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          SAT Linear Equations Practice
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          Linear equations sit at the heart of the Digital SAT math section. Whether you’re solving for x, graphing a line, or turning a word problem into an equation, practice here pays off. This guide covers what’s tested and how to get better with SAT linear equations practice.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Are Linear Equations on the SAT?</h2>
            <p className="leading-relaxed mb-3">
              You’ll see equations in one or two variables that graph as straight lines. The SAT tests solving them (isolating x or y), interpreting slope and intercepts, and setting them up from word problems. Systems of two linear equations also appear regularly.
            </p>
            <p className="leading-relaxed">
              No matter how the question is wrapped—tables, graphs, or story problems—the core skill is recognizing and working with linear relationships.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Linear Equations Matter on the Digital SAT</h2>
            <p className="leading-relaxed mb-3">
              Linear equations are part of Heart of Algebra, which makes up a large portion of the math section. Doing well here supports your overall score and builds confidence for harder questions. The test often combines linear equations with real-world contexts, so fluency with setup and solving is essential.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Solving one-variable equations (ax + b = c)</li>
              <li>Slope, y-intercept, and equation of a line</li>
              <li>Systems of two linear equations (substitution, elimination)</li>
              <li>Word problems that lead to linear equations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Mistakes on Linear Equation Questions</h2>
            <p className="leading-relaxed mb-3">
              A few slip-ups show up often. Catching them in practice saves points on test day.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Distribution errors.</strong> When you have 2(x + 3), that’s 2x + 6. Missing a term or sign is easy; do one quick check.</li>
              <li><strong className="text-slate-900">Slope vs. intercept.</strong> In y = mx + b, m is slope and b is the y-intercept. Don’t mix them when reading a graph or equation.</li>
              <li><strong className="text-slate-900">Solving for the wrong variable.</strong> The question might ask for 2x or for y. Underline what you need before solving.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example SAT Linear Equations Practice</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1</p>
              <p className="mb-2">If 3(2x − 4) = 6, what is the value of x?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> 6x − 12 = 6, so 6x = 18, and x = 3.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2</p>
              <p className="mb-2">A line passes through (0, 4) and (2, 10). What is its slope?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Slope = (10 − 4)/(2 − 0) = 6/2 = 3.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Tips to Get Better at Linear Equations</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Practice both solving and setting up. Word problems are where many students lose points—turn the sentence into an equation step by step.</li>
              <li>Know slope-intercept form (y = mx + b) and how to read slope and intercept from a graph or table.</li>
              <li>For systems, practice substitution and elimination until you can choose the faster method quickly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How many linear equation questions are on the Digital SAT?</dt>
                <dd className="text-slate-700">Heart of Algebra includes linear equations and makes up about 35% of the math section. You’ll see several such questions per test.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Should I use substitution or elimination for systems?</dt>
                <dd className="text-slate-700">Use whichever is faster for that problem. If one equation is already solved for x or y, substitution is often quick. If coefficients line up, elimination can be easier.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">What’s the best way to practice SAT linear equations?</dt>
                <dd className="text-slate-700">Do SAT-style questions that mix solving, graphing, and word problems. Read the explanation after each one to reinforce setup and avoid repeated mistakes.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Improve Your SAT Math Score With Linear Equations Practice</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get linear equations and full math practice that matches the Digital SAT, with instant explanations.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Practice by topic—linear equations, systems, word problems</li>
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
