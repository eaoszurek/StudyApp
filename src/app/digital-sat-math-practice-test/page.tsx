import Link from "next/link";
import PrimaryButton from "@/components/ui/PrimaryButton";

export default function DigitalSatMathPracticeTestPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <p className="mb-6">
          <Link href="/" className="text-sky-600 hover:text-sky-700 font-medium underline">
            ← Back to SAT Practice App
          </Link>
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          Digital SAT Math Practice Test
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          The Digital SAT math section is adaptive, calculator-allowed, and focused on algebra, problem solving, advanced math, and geometry. Taking a full Digital SAT math practice test helps you get used to the format, timing, and question styles so you’re ready on test day.
        </p>

        <article className="space-y-8 text-slate-700">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What Is the Digital SAT Math Section?</h2>
            <p className="leading-relaxed mb-3">
              The math section has two modules of roughly 22 questions each. The first module is a mix of difficulty; your performance there affects the difficulty of the second module. You have a calculator for the entire section, and questions are a mix of multiple choice and student-produced response.
            </p>
            <p className="leading-relaxed">
              Content is split across four areas: Heart of Algebra, Problem Solving and Data Analysis, Passport to Advanced Math, and Additional Topics in Math. A good Digital SAT math practice test will reflect that mix.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Why Take a Full Math Practice Test?</h2>
            <p className="leading-relaxed mb-3">
              Timed, full-length practice does more than review content. It builds stamina, helps you manage time, and shows where you’re strong or need work. Recreating test conditions—especially the length and pacing of the section—makes the real test feel familiar instead of overwhelming.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700">
              <li>Get used to the length and pacing of the section</li>
              <li>See how you perform across algebra, data, advanced math, and geometry</li>
              <li>Identify topics to review before test day</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">What to Look for in a Digital SAT Math Practice Test</h2>
            <p className="leading-relaxed mb-3">
              Not all practice tests are equal. The best ones mirror the real exam in style and structure.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong className="text-slate-900">Question style.</strong> Digital SAT questions are concise. Look for practice that uses short stems and clear answer choices, not long, textbook-style problems.</li>
              <li><strong className="text-slate-900">Calculator use.</strong> Since the real test allows a calculator throughout, your practice should too. Get comfortable deciding when to use it and when mental math is faster.</li>
              <li><strong className="text-slate-900">Explanations.</strong> After the test, you need to understand why answers are correct. Practice with explanations helps you fix mistakes and avoid repeating them.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Example Digital SAT Math Practice Questions</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-4">
              <p className="font-medium text-slate-900 mb-2">Example 1 (Heart of Algebra)</p>
              <p className="mb-2">If 2x + 3 = 11, what is the value of 4x − 1?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> From 2x + 3 = 11, we get 2x = 8, so x = 4. Then 4x − 1 = 16 − 1 = 15.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-slate-900 mb-2">Example 2 (Problem Solving)</p>
              <p className="mb-2">A store raises a price by 20%, then runs a 25% off sale. What single percent change from the original price does the customer pay?</p>
              <p className="text-sm text-slate-600"><strong className="text-slate-700">Explanation:</strong> Original × 1.20 × 0.75 = Original × 0.90. So the customer pays 90% of the original—a 10% decrease.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">How to Use a Practice Test Effectively</h2>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>Take the full section in one sitting, with a timer. Use the same calculator you’ll use on test day.</li>
              <li>After scoring, review every question you missed or guessed on. Read the explanation and redo the problem without looking.</li>
              <li>Note which topics showed up most in your errors and do extra practice there before the next full test.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How long is the Digital SAT math section?</dt>
                <dd className="text-slate-700">You have two 35-minute modules with about 22 questions each. Total math time is 70 minutes.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">Can I use a calculator on the whole math section?</dt>
                <dd className="text-slate-700">Yes. The Digital SAT allows an approved calculator for the entire math section.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900 mb-1">How often should I take a full Digital SAT math practice test?</dt>
                <dd className="text-slate-700">Once every 1–2 weeks is a good rhythm. Use the time between tests to review weak areas and do targeted practice.</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Take a Free Digital SAT Math Practice Test</h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Get a Digital SAT–style math practice test with instant scoring and step-by-step explanations.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-5">
              <li>Timed math practice that matches the real section</li>
              <li>Instant feedback and explanations for every question</li>
              <li>Free to start—no credit card required</li>
            </ul>
            <Link href="/">
              <PrimaryButton>Start free practice test</PrimaryButton>
            </Link>
          </section>
        </article>
      </div>
    </main>
  );
}
