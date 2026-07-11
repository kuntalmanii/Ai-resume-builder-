/**
 * ATS Score Ring and Category Score Bars.
 */
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AtsScoreRingProps {
  score: number;
  size?: "sm" | "lg";
  className?: string;
}

export function AtsScoreRing({ score, size = "lg", className }: AtsScoreRingProps) {
  const [offset, setOffset] = useState(0);
  
  const diameter = size === "sm" ? 60 : 120;
  const strokeWidth = size === "sm" ? 6 : 10;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    // Mount animation delay
    const timer = setTimeout(() => {
      const progress = Math.max(0, Math.min(score, 100)) / 100;
      setOffset(circumference - progress * circumference);
    }, 150);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const getScoreColorClass = (val: number) => {
    if (val >= 85) return "stroke-score-excellent text-score-excellent";
    if (val >= 70) return "stroke-score-good text-score-good";
    if (val >= 50) return "stroke-score-average text-score-average";
    return "stroke-score-poor text-score-poor";
  };

  const getScoreTextClass = (val: number) => {
    if (val >= 85) return "text-score-excellent";
    if (val >= 70) return "text-score-good";
    if (val >= 50) return "text-score-average";
    return "text-score-poor";
  };

  const getLabel = (val: number) => {
    if (val >= 85) return "Excellent";
    if (val >= 70) return "Good";
    if (val >= 50) return "Average";
    return "Needs Work";
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg className="-rotate-90" width={diameter} height={diameter}>
          {/* Track */}
          <circle
            className="stroke-score-ring-track fill-transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={diameter / 2}
            cy={diameter / 2}
          />
          {/* Animated Fill */}
          <circle
            className={cn("fill-transparent transition-all duration-1000 ease-out", getScoreColorClass(score).split(" ")[0])}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={radius}
            cx={diameter / 2}
            cy={diameter / 2}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          <span className={cn(
            "font-bold tracking-tight leading-none",
            size === "sm" ? "text-sm" : "text-3xl",
            getScoreColorClass(score).split(" ")[1]
          )}>
            {score}
          </span>
          {size === "lg" && (
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">/100</span>
          )}
        </div>
      </div>
      {size === "lg" && (
        <span className={cn("text-xs font-semibold mt-2", getScoreTextClass(score))}>
          {getLabel(score)}
        </span>
      )}
    </div>
  );
}

interface CategoryScoreBarProps {
  label: string;
  score: number;
  className?: string;
}

export function CategoryScoreBar({ label, score, className }: CategoryScoreBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getBarColor = (val: number) => {
    if (val >= 85) return "bg-score-excellent";
    if (val >= 70) return "bg-score-good";
    if (val >= 50) return "bg-score-average";
    return "bg-score-poor";
  };

  const getTextColor = (val: number) => {
    if (val >= 85) return "text-score-excellent";
    if (val >= 70) return "text-score-good";
    if (val >= 50) return "text-score-average";
    return "text-score-poor";
  };

  return (
    <div className={cn("space-y-1 w-full", className)}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-foreground">{label}</span>
        <span className={cn("font-bold", getTextColor(score))}>{score}</span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", getBarColor(score))}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
