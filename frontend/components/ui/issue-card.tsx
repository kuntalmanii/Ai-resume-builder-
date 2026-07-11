/**
 * SeverityBadge and IssueCard components for analysis results.
 */
"use client";

import { Sparkles, Eye, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SeverityType = "high" | "medium" | "low" | "pass";

interface SeverityBadgeProps {
  severity: SeverityType;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const styles = {
    high: "bg-error-subtle text-error border-red-200",
    medium: "bg-warning-subtle text-warning border-amber-200",
    low: "bg-primary-subtle text-primary border-blue-200",
    pass: "bg-accent-subtle text-accent border-emerald-200",
  };

  const label = {
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    pass: "PASS",
  };

  const dotColor = {
    high: "bg-error",
    medium: "bg-warning",
    low: "bg-primary",
    pass: "bg-accent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider select-none",
        styles[severity],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor[severity])} />
      {label[severity]}
    </span>
  );
}

export interface Issue {
  id: string;
  category: string;
  severity: SeverityType;
  title: string;
  originalText?: string;
  explanation: string;
}

interface IssueCardProps {
  issue: Issue;
  onFixWithAi?: (issueId: string) => void;
  onViewEvidence?: (issueId: string) => void;
  className?: string;
}

export function IssueCard({
  issue,
  onFixWithAi,
  onViewEvidence,
  className,
}: IssueCardProps) {
  const leftBorderColor = {
    high: "border-l-error",
    medium: "border-l-warning",
    low: "border-l-primary",
    pass: "border-l-accent",
  };

  return (
    <div
      className={cn(
        "bg-card border border-border border-l-4 rounded-md shadow-xs p-4 flex flex-col gap-3 transition-all hover:shadow-sm hover:border-border-strong",
        leftBorderColor[issue.severity],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {issue.category}
          </span>
        </div>
        {issue.severity === "pass" && (
          <CheckCircle2 className="w-4 h-4 text-accent" />
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground leading-tight">
          {issue.title}
        </h4>
        <p className="text-xs text-text-secondary leading-relaxed">
          {issue.explanation}
        </p>
      </div>

      {issue.originalText && (
        <div className="bg-[#F1F3F6] p-2 rounded-xs border border-border/40">
          <p className="font-mono text-[11px] text-text-secondary italic leading-relaxed">
            "{issue.originalText}"
          </p>
        </div>
      )}

      {issue.severity !== "pass" && (onFixWithAi || onViewEvidence) && (
        <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border-subtle">
          {onFixWithAi && (
            <Button
              onClick={() => onFixWithAi(issue.id)}
              variant="ghost"
              size="sm"
              className="h-[28px] px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary-subtle border-0"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Fix with AI
            </Button>
          )}
          {onViewEvidence && (
            <Button
              onClick={() => onViewEvidence(issue.id)}
              variant="ghost"
              size="sm"
              className="h-[28px] px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border-0"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              View Evidence
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
