"use client";

import React from "react";

interface WritingQuestionProps {
  question: string;
  className?: string;
}

export default function WritingQuestion({ question, className = "" }: WritingQuestionProps) {
  // Parse the question text to find [underlined] portions
  const formatQuestion = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>
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
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`}>{text.substring(lastIndex)}</span>
      );
    }
    
    // If no brackets found, return original text
    if (parts.length === 0) {
      return [<span key="no-format">{text}</span>];
    }
    
    return parts;
  };

  return (
    <p className={`${className} leading-relaxed`}>
      {formatQuestion(question)}
    </p>
  );
}

