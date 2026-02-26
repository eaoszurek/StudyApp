"use client";

import React from "react";

interface WritingQuestionProps {
  question: string;
  className?: string;
}

export default function WritingQuestion({ question, className = "" }: WritingQuestionProps) {
  // Parse the question text to find [underlined] portions
  const formatQuestion = (text: string): React.ReactNode[] => {
    const normalizedText = text
      .replace(/\*\*(.+?)\*\*/g, "[$1]")
      .replace(/__(.+?)__/g, "[$1]")
      .replace(/<([^>]+)>/g, "[$1]");
    const parts: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(normalizedText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{normalizedText.substring(lastIndex, match.index)}</span>
        );
      }
      
      // Add underlined portion
      parts.push(
        <u key={`underline-${key++}`} className="underline decoration-2 decoration-sky-600 dark:decoration-sky-400 font-semibold">
          {match[1]}
        </u>
      );
      
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < normalizedText.length) {
      parts.push(
        <span key={`text-${key++}`}>{normalizedText.substring(lastIndex)}</span>
      );
    }
    
    // If no markers found, underline a best-effort phrase so the prompt remains usable.
    if (parts.length === 0) {
      const fallbackMatch = normalizedText.match(/([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){1,4})/);
      if (!fallbackMatch) {
        return [<span key="no-format">{normalizedText}</span>];
      }

      const target = fallbackMatch[1];
      const start = normalizedText.indexOf(target);
      const before = normalizedText.slice(0, start);
      const after = normalizedText.slice(start + target.length);

      return [
        <span key="fallback-before">{before}</span>,
        <u key="fallback-underline" className="underline decoration-2 decoration-sky-600 dark:decoration-sky-400 font-semibold">
          {target}
        </u>,
        <span key="fallback-after">{after}</span>,
      ];
    }
    
    return parts;
  };

  return (
    <p className={`${className} leading-relaxed whitespace-pre-line`}>
      {formatQuestion(question)}
    </p>
  );
}

