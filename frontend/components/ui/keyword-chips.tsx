/**
 * Reusable Keyword Chips for ATS matching.
 */
"use client";

import { Check, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordChipProps {
  label: string;
  type: "exact" | "semantic" | "missing";
  semanticDetail?: string; // Optional mapping detail (e.g. "Similar to Backend Development")
  onAdd?: () => void;
  className?: string;
}

export function KeywordChip({
  label,
  type,
  semanticDetail,
  onAdd,
  className,
}: KeywordChipProps) {
  if (type === "exact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold bg-accent-subtle border border-accent/20 text-accent transition-all select-none",
          className
        )}
        title="Exact Match found in resume"
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>{label}</span>
      </div>
    );
  }

  if (type === "semantic") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold bg-primary-subtle border border-primary/20 text-primary transition-all select-none",
          className
        )}
        title={semanticDetail ?? "Semantic Match found (AI matched)"}
      >
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      disabled={!onAdd}
      type="button"
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold bg-[#F1F3F6] border border-dashed border-border-strong text-text-secondary transition-all hover:bg-muted/80 cursor-pointer disabled:cursor-default active:scale-[0.98]",
        className
      )}
      title="Missing from resume. Click to add"
    >
      <Plus className="w-3.5 h-3.5 text-text-muted stroke-[2.5]" />
      <span>{label}</span>
    </button>
  );
}

interface KeywordGridProps {
  keywords: { label: string; type: "exact" | "semantic" | "missing"; semanticDetail?: string }[];
  onAddKeyword?: (label: string) => void;
  className?: string;
}

export function KeywordGrid({ keywords, onAddKeyword, className }: KeywordGridProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {keywords.map((kw) => (
        <KeywordChip
          key={kw.label}
          label={kw.label}
          type={kw.type}
          semanticDetail={kw.semanticDetail}
          onAdd={kw.type === "missing" && onAddKeyword ? () => onAddKeyword(kw.label) : undefined}
        />
      ))}
    </div>
  );
}
