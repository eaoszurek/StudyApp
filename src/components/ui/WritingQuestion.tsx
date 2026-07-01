"use client";

import React from "react";

interface WritingQuestionProps {
  question: string;
  className?: string;
}

// Strips any legacy markup the generator may still emit (brackets, bold, angle markers, underscores)
// so writing passages/questions render as plain, readable text. The question stem itself now
// references the target word/phrase explicitly, so no visual highlighting is needed.
function stripLegacyMarkup(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/<([^>]+)>/g, "$1");
}

export default function WritingQuestion({ question, className = "" }: WritingQuestionProps) {
  return (
    <p className={`${className} leading-relaxed whitespace-pre-line`}>
      {stripLegacyMarkup(question)}
    </p>
  );
}
