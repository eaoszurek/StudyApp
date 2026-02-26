import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function SatGeometryPracticeQuestionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          SAT Geometry Practice Questions
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          Geometry on the Digital SAT appears under “Additional Topics in Math.” You don’t need to memorize dozens of proofs—you do need area, angles, triangles, circles, and basic coordinate geometry. This guide covers what’s tested and how to practice with SAT geometry practice questions.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Geometry Is on the Digital SAT?</h2>
            <p className="leading-relaxed mb-3">
              The SAT focuses on applied geometry: formulas and reasoning, not long proofs. You’ll see area and perimeter, angles in triangles and parallel lines, circle equations and arc length, and the Pythagorean theorem. Volume and surface area sometimes show up as well.
            </p>
            <p className="leading-relaxed">
              Questions are often tied to real-world situations or diagrams. Being comfortable with the main formulas and when to use them is what matters.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Geometry Practice Helps</h2>
            <p className="leading-relaxed mb-3">
              Geometry is a smaller share of the math section than algebra, but missing it can still hurt your score. A few targeted SAT geometry practice questions each week keep the formulas and setups fresh so you don’t lose points on test day.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Triangles: area, Pythagorean theorem, special right triangles, angle sum</li>
              <li>Circles: area, circumference, sector area, arc length, equation of a circle</li>
              <li>Angles: vertical angles, parallel lines cut by a transversal</li>
              <li>Area and perimeter of polygons</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Common Geometry Mistakes</h2>
            <p className="leading-relaxed mb-3">
              Students often slip up in a few predictable ways. Watch for these when you practice.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Using the wrong formula.</strong> Circle area is πr², not 2πr (that’s circumference). Double-check which quantity the question asks for.</li>
              <li><strong className="text-slate-900">Radius vs. diameter.</strong> Plugging the diameter into a formula that needs the radius is a common error. Read the diagram or problem carefully.</li>
              <li><strong className="text-slate-900">Angle mix-ups.</strong> In parallel-line setups, identify corresponding and alternate interior angles correctly before solving.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example SAT Geometry Practice Questions</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1</p>
              <p className="mb-2">A circle has radius 5. What is the area of a sector with central angle 72°?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Sector area = (72/360) × π(5)² = (1/5)(25π) = 5π.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2</p>
              <p className="mb-2">In a right triangle, the legs have lengths 6 and 8. What is the length of the hypotenuse?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> By the Pythagorean theorem, c² = 6² + 8² = 36 + 64 = 100, so c = 10.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">How to Improve at SAT Geometry</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Keep a short formula list (area, circumference, Pythagorean theorem, circle equation) and review it before practice.</li>
              <li>Draw or redraw diagrams when the problem doesn’t provide one; it helps you see what to solve for.</li>
              <li>After each practice question, note which formula you used so you build pattern recognition.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How much geometry is on the Digital SAT?</dt>
                <dd className="text-slate-700">Additional Topics in Math is about 15% of the section. Geometry is a part of that, so you’ll see a handful of geometry questions per test.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Do I need to memorize a lot of formulas?</dt>
                <dd className="text-slate-700">The SAT provides a reference sheet with many formulas. You still need to know when and how to use them quickly.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">What’s the best way to practice SAT geometry?</dt>
                <dd className="text-slate-700">Do SAT-style geometry questions with explanations. Focus on area, circles, triangles, and angles until they feel automatic.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Boost Your Score With SAT Geometry Practice</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get geometry and full math practice that matches the Digital SAT, with instant explanations.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Practice by topic—focus on geometry or mix with algebra</li>
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
