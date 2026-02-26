import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function SatAlgebraPracticeQuestionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          SAT Algebra Practice Questions
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          Algebra is a core part of the Digital SAT math section. With focused practice, you can learn the patterns the test uses and avoid the traps that cost points. This guide covers what to expect, common mistakes, and how to improve with targeted SAT algebra practice questions.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Is SAT Algebra?</h2>
            <p className="leading-relaxed mb-3">
              On the Digital SAT, algebra appears under “Heart of Algebra” in both math modules. You’ll see linear equations, inequalities, systems of equations, and linear functions. The test checks whether you can set up and solve problems, not long arithmetic.
            </p>
            <p className="leading-relaxed">
              Questions often use real-world contexts: budgets, distances, or rates. You need to turn the words into equations, solve, and sometimes interpret the result.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Algebra Matters on the Digital SAT</h2>
            <p className="leading-relaxed mb-3">
              Algebra is one of the four main math areas and carries real weight. Doing well here supports your overall math score. The Digital SAT adapts: a stronger first module leads to harder questions, where algebra can appear in trickier forms.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Linear equations and inequalities in one or two variables</li>
              <li>Systems of linear equations</li>
              <li>Linear functions and graphs (slope, intercepts, rate of change)</li>
              <li>Word problems you must translate into algebra</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Mistakes on SAT Algebra Questions</h2>
            <p className="leading-relaxed mb-3">
              A few mistakes show up often. Spotting them in practice helps you avoid them on test day.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Misreading the question.</strong> Solving for x when the question asks for 2x, or wrong units. Underline what you’re solving for first.</li>
              <li><strong className="text-slate-900">Sign errors.</strong> Dropping a negative or flipping an inequality when dividing by a negative. Do a quick check before moving on.</li>
              <li><strong className="text-slate-900">Guessing the setup.</strong> Word problems have a specific equation. Write the equation that matches the story.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example SAT Algebra Practice Questions</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1</p>
              <p className="mb-2">A store sells notebooks for $3 and pens for $1. Maria buys 12 items and spends $28. How many notebooks did she buy?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Let n = notebooks, p = pens. Then n + p = 12 and 3n + p = 28. Subtracting: 2n = 16, so n = 8.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2</p>
              <p className="mb-2">For what value of k does 2x + 4 = kx + 8 have no solution?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> No solution when slopes match but intercepts don’t. So 2 = k. Then 4 ≠ 8, so k = 2.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Tips to Improve Faster</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Do algebra practice in short blocks (5–10 questions) so you stay sharp on setup and solving.</li>
              <li>Read the explanation after every question, even when you’re right; you might learn a faster method.</li>
              <li>Redo any problem you got wrong until you can do it cleanly without the answer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How many algebra questions are on the Digital SAT?</dt>
                <dd className="text-slate-700">Heart of Algebra is about 35% of the math section. Exact counts vary by form.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Do I need a calculator for SAT algebra?</dt>
                <dd className="text-slate-700">The Digital SAT allows a calculator on all math. Use it when it’s faster and more accurate for you.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">What’s the best way to practice SAT algebra?</dt>
                <dd className="text-slate-700">Use questions that look like the real test and practice turning word problems into equations.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Raise Your SAT Math Score With Targeted Practice</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get SAT algebra practice questions that match the Digital SAT, with instant explanations and strategy tips.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Practice by topic and difficulty</li>
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
