export const MAX_STORED_PRACTICE_QUESTIONS = 50;
export const PRACTICE_APPEND_REQUEST_ID_FIELD = "__appendRequestId";

type PracticeQuestionRecord = Record<string, any>;

export type AppendPracticeQuestionsResult =
  | {
      ok: true;
      appendedQuestions: PracticeQuestionRecord[];
      mergedQuestions: PracticeQuestionRecord[];
      mergedPassage: string | null;
      reusedExistingAppend: boolean;
    }
  | {
      ok: false;
      reason: "full";
    };

export function parseStoredPracticeQuestions(raw: string | null | undefined): PracticeQuestionRecord[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stripPracticeAppendMetadata<T extends PracticeQuestionRecord>(question: T): T {
  const { [PRACTICE_APPEND_REQUEST_ID_FIELD]: _appendRequestId, ...cleanQuestion } = question;
  return cleanQuestion as T;
}

export function stripPracticeAppendMetadataFromQuestions<T extends PracticeQuestionRecord>(
  questions: T[]
): T[] {
  return questions.map((question) => stripPracticeAppendMetadata(question));
}

export function appendPracticeQuestions({
  existingQuestions,
  generatedQuestions,
  existingPassage,
  generatedPassage,
  appendRequestId,
  maxQuestions = MAX_STORED_PRACTICE_QUESTIONS,
}: {
  existingQuestions: PracticeQuestionRecord[];
  generatedQuestions: PracticeQuestionRecord[];
  existingPassage: string | null | undefined;
  generatedPassage: string | null | undefined;
  appendRequestId?: string;
  maxQuestions?: number;
}): AppendPracticeQuestionsResult {
  const normalizedAppendRequestId = appendRequestId?.trim();

  if (normalizedAppendRequestId) {
    const existingAppend = existingQuestions.filter(
      (question) =>
        question?.[PRACTICE_APPEND_REQUEST_ID_FIELD] === normalizedAppendRequestId
    );

    if (existingAppend.length > 0) {
      return {
        ok: true,
        appendedQuestions: stripPracticeAppendMetadataFromQuestions(existingAppend),
        mergedQuestions: existingQuestions,
        mergedPassage: existingPassage || generatedPassage || null,
        reusedExistingAppend: true,
      };
    }
  }

  const availableSlots = maxQuestions - existingQuestions.length;
  if (availableSlots <= 0) {
    return { ok: false, reason: "full" };
  }

  const offset = existingQuestions.length;
  const appendedForStorage = generatedQuestions
    .slice(0, availableSlots)
    .map((question, idx) => ({
      ...question,
      id: offset + idx + 1,
      ...(normalizedAppendRequestId
        ? { [PRACTICE_APPEND_REQUEST_ID_FIELD]: normalizedAppendRequestId }
        : {}),
    }));

  return {
    ok: true,
    appendedQuestions: stripPracticeAppendMetadataFromQuestions(appendedForStorage),
    mergedQuestions: [...existingQuestions, ...appendedForStorage],
    mergedPassage: existingPassage || generatedPassage || null,
    reusedExistingAppend: false,
  };
}
