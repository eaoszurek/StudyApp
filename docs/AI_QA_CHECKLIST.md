# AI Output QA Checklist (SAT)

Use this checklist to review AI output from the sampling script or manually generated content.

## Global checks (all outputs)
- Output is valid JSON and matches the expected schema.
- No markdown, code blocks, or extra commentary.
- Clear, professional, tutor-like tone.
- No non-SAT topics or off-topic content.
- Math notation is clean (no caret `^`).
- No broken characters or formatting blobs.

## Practice tests (generate-practice)
- Reading outputs include a separate `passage` field.
- Reading question text does **not** include passage text.
- Options are A–D only and all are plausible.
- Correct answer matches explanation.
- Explanations teach reasoning, not just the answer.
- Wrong-answer explanations explain common mistakes.
- Difficulty matches the selected level.

## Micro-lessons (ai/lessons)
- Lesson is 1–2 minutes in length.
- Bulleted explanations are step-by-step.
- Example is simple and directly illustrates the concept.
- Practice question is concise and not repetitive.
- Explanations are encouraging and tutor-like.

## Flashcards (generate-flashcards)
- Front term is 1–4 words.
- Back uses `TERM — definition` format.
- Definition is clear and SAT-appropriate.
- Examples (if any) are concise and correct.

## Legacy endpoints
- `generate-question` still produces SAT-style prompts.
- `generate-plan` produces structured SAT study content.
