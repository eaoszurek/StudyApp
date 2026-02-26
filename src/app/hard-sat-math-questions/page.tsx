import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function HardSatMathQuestionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          Hard SAT Math Questions
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          The hardest SAT math questions combine multiple concepts, non-obvious setups, or tricky wording. Practicing with hard SAT math questions builds the confidence and skills you need for the tougher second module and for maximizing your score. This guide covers what makes questions hard and how to tackle them.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Makes an SAT Math Question “Hard”?</h2>
            <p className="leading-relaxed mb-3">
              Hard questions aren’t just more calculation—they demand deeper reasoning. You might need to combine algebra and geometry, interpret a subtle condition in a word problem, or spot the most efficient approach among several options. The Digital SAT also adapts: do well in the first module and you’ll see more of these in the second.
            </p>
            <p className="leading-relaxed">
              They’re still built from the same core topics: algebra, data, advanced math, and geometry. What changes is complexity, steps, and how easily the path to the answer is hidden.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Practice Hard SAT Math Questions?</h2>
            <p className="leading-relaxed mb-3">
              If you only practice medium or easy questions, the hard ones on test day will feel unfamiliar. Working through hard SAT math questions in practice teaches you to stay calm, break problems into steps, and recognize when to try a different approach.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Build stamina for multi-step problems</li>
              <li>Learn to spot “trap” answers and subtle wording</li>
              <li>Get comfortable with the hardest content so the real test feels manageable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Traits of Hard Questions</h2>
            <p className="leading-relaxed mb-3">
              Hard questions often share a few characteristics. Recognizing them helps you know what to expect.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Multiple concepts in one problem.</strong> You might need algebra and a geometry fact, or a function and an inequality. Break the problem into parts and solve each step clearly.</li>
              <li><strong className="text-slate-900">Non-obvious setup.</strong> The equation or relationship isn’t given; you have to infer it from the wording or a diagram. Underline key conditions and re-read before solving.</li>
              <li><strong className="text-slate-900">Tricky answer choices.</strong> Wrong answers often look plausible—they might be a partial result or a result for a different interpretation. Always check that your answer matches what the question asked.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example Hard SAT Math Questions</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1</p>
              <p className="mb-2">The function f is defined by f(x) = x² − 4x + 3. For what value of k does the equation f(x) = k have exactly one real solution?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> The parabola has vertex at x = 2, and f(2) = 4 − 8 + 3 = −1. So f(x) = k has exactly one solution when the horizontal line y = k is tangent to the parabola—at the vertex. So k = −1.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2</p>
              <p className="mb-2">A rectangle has perimeter 28 and area 48. What is the length of the longer side?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Let length L and width W. Then 2L + 2W = 28 and LW = 48. So L + W = 14. The sides are roots of t² − 14t + 48 = 0, so (t − 6)(t − 8) = 0. The longer side is 8.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">How to Get Better at Hard SAT Math Questions</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Start with the basics. If you’re shaky on algebra or geometry, hard questions will feel impossible. Solidify core topics first, then add hard practice.</li>
              <li>After each hard question, write down what made it hard (wording? multiple steps? concept?) and what you’d do differently next time.</li>
              <li>Give yourself a time limit per question in practice (e.g., 2 minutes). If you’re stuck, guess and move on, then review the explanation later.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How many hard questions are on the Digital SAT math section?</dt>
                <dd className="text-slate-700">It depends on how you do in the first module. If you do well, the second module will have more challenging questions. There’s no fixed count.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Should I skip hard questions on the real test?</dt>
                <dd className="text-slate-700">If you’re stuck after a minute or two, mark it and move on. Come back if you have time. It’s better to answer all the questions you can than to get stuck on one.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">What’s the best way to practice hard SAT math questions?</dt>
                <dd className="text-slate-700">Use practice that tags difficulty and includes hard questions with full explanations. Do them timed, then review every mistake in detail.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Practice Hard SAT Math Questions and Raise Your Score</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get practice that includes hard SAT math questions, with instant explanations and difficulty levels.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Choose difficulty—practice hard questions when you’re ready</li>
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
