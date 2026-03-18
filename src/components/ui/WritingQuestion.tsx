"use client";

import React from "react";

interface WritingQuestionProps {
  question: string;
  className?: string;
}

export default function WritingQuestion({ question, className = "" }: WritingQuestionProps) {
  // Parse text to find explicit [underlined] portions
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
    
    // No explicit marker => render text as-is.
    if (parts.length === 0) return [<span key="plain">{normalizedText}</span>];
    
    return parts;
  };

  return (
    <p className={`${className} leading-relaxed whitespace-pre-line`}>
      {formatQuestion(question)}
    </p>
  );
}

