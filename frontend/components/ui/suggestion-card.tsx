/**
 * SuggestionCard, ConfidenceIndicator, and UnverifiedWarning components for the AI improvement workspace.
 */
"use client";

import { Sparkles, Check, Edit2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  className?: string;
}

export function ConfidenceIndicator({ confidence, className }: ConfidenceIndicatorProps) {
  const getFillColor = (val: number) => {
    if (val >= 85) return "bg-score-excellent";
    if (val >= 70) return "bg-score-good";
    if (val >= 50) return "bg-score-average";
    return "bg-score-poor";
  };

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <span className="text-[11px] font-semibold text-muted-foreground">Confidence</span>
      <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getFillColor(confidence))}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs font-bold text-foreground">{confidence}%</span>
    </div>
  );
}

interface UnverifiedWarningProps {
  claim: string;
  onVerify?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function UnverifiedWarning({
  claim,
  onVerify,
  onRemove,
  className,
}: UnverifiedWarningProps) {
  return (
    <div
      className={cn(
        "bg-warning-subtle border-l-4 border-l-warning border-y border-r border-amber-200/50 rounded-md p-3.5 flex flex-col gap-2.5",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-warning font-bold text-xs uppercase tracking-wider">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span>Unverified Claim</span>
      </div>
      
      <p className="text-xs text-text-secondary leading-relaxed">
        The metric <strong className="text-foreground font-semibold">"{claim}"</strong> was not found in your resume or verified career profile. Confirm before adding.
      </p>

      {(onVerify || onRemove) && (
        <div className="flex gap-2.5 mt-0.5">
          {onVerify && (
            <Button
              onClick={onVerify}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] font-medium border-amber-300 hover:bg-amber-100/50 text-warning"
            >
              I'll verify this
            </Button>
          )}
          {onRemove && (
            <Button
              onClick={onRemove}
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 border-0"
            >
              Remove this claim
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export interface Suggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  confidence: number;
  unverifiedClaim?: string; // If present, displays the claim alert
  evidence: { item: string; source: "resume" | "profile" | "inference" }[];
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept?: (id: string, text: string) => void;
  onEdit?: (id: string) => void;
  onReject?: (id: string) => void;
  onVerifyClaim?: (id: string) => void;
  onRemoveClaim?: (id: string) => void;
  className?: string;
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onEdit,
  onReject,
  onVerifyClaim,
  onRemoveClaim,
  className,
}: SuggestionCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-md shadow-sm p-4 flex flex-col gap-4 transition-all hover:border-border-strong",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>AI Suggestion</span>
        </div>
        <ConfidenceIndicator confidence={suggestion.confidence} />
      </div>

      {/* Comparison blocks */}
      <div className="space-y-3">
        {/* Original */}
        <div className="bg-[#F1F3F6] border border-border/40 rounded-xs p-3 relative pt-5">
          <span className="absolute top-1.5 left-2.5 text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
            Original
          </span>
          <p className="text-xs text-text-secondary leading-relaxed">
            {suggestion.originalText}
          </p>
        </div>

        {/* Suggested */}
        <div className="bg-card border border-border border-l-4 border-l-accent rounded-xs p-3 relative pt-5 shadow-xs">
          <span className="absolute top-1.5 left-2.5 text-[9px] font-bold text-accent tracking-wider uppercase">
            Suggested Improvement
          </span>
          <p className="text-xs text-foreground font-medium leading-relaxed">
            {suggestion.suggestedText}
          </p>
        </div>
      </div>

      {/* Unverified Claim Alert if applicable */}
      {suggestion.unverifiedClaim && (
        <UnverifiedWarning
          claim={suggestion.unverifiedClaim}
          onVerify={onVerifyClaim ? () => onVerifyClaim(suggestion.id) : undefined}
          onRemove={onRemoveClaim ? () => onRemoveClaim(suggestion.id) : undefined}
        />
      )}

      {/* Evidence checklist */}
      {suggestion.evidence.length > 0 && (
        <div className="space-y-1.5 border-t border-border-subtle pt-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Evidence Backing This suggestion
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestion.evidence.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#F1F3F6] border border-border/30 text-[11px] font-medium"
              >
                <span className="text-text-secondary truncate">{ev.item}</span>
                <span className="text-[10px] text-muted-foreground select-none shrink-0 font-semibold italic flex items-center gap-1">
                  {ev.source === "resume" && "📄 Resume"}
                  {ev.source === "profile" && "👤 Profile"}
                  {ev.source === "inference" && "🤖 Inference"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2 border-t border-border-subtle pt-3 mt-1">
        {onAccept && (
          <Button
            onClick={() => onAccept(suggestion.id, suggestion.suggestedText)}
            className="h-[36px] bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold px-4 rounded-sm flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Accept
          </Button>
        )}
        {onEdit && (
          <Button
            onClick={() => onEdit(suggestion.id)}
            variant="ghost"
            className="h-[36px] px-3 border border-border text-xs text-text-secondary hover:text-foreground hover:bg-muted/50 rounded-sm flex items-center gap-1.5"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </Button>
        )}
        {onReject && (
          <Button
            onClick={() => onReject(suggestion.id)}
            variant="ghost"
            className="h-[36px] px-3 border-0 text-xs text-error hover:text-error hover:bg-error-subtle rounded-sm flex items-center gap-1.5 ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
