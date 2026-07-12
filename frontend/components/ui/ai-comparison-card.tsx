"use client";

import { SuggestionCard, Suggestion } from "./suggestion-card";

interface AIComparisonCardProps {
  id: string;
  originalText: string;
  suggestedText: string;
  confidence: number;
  unverifiedClaim?: string;
  evidence: { item: string; source: "resume" | "profile" | "inference" }[];
  onAccept?: (id: string, text: string) => void;
  onEdit?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

export function AIComparisonCard({
  id,
  originalText,
  suggestedText,
  confidence,
  unverifiedClaim,
  evidence,
  onAccept,
  onEdit,
  onReject,
  className,
}: AIComparisonCardProps) {
  const suggestionData: Suggestion = {
    id,
    originalText,
    suggestedText,
    confidence,
    unverifiedClaim,
    evidence,
  };

  return (
    <SuggestionCard
      suggestion={suggestionData}
      onAccept={onAccept}
      onEdit={onEdit}
      onReject={onReject}
      className={className}
    />
  );
}

export default AIComparisonCard;
