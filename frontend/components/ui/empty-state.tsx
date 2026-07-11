/**
 * Reusable EmptyState component.
 */
"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 text-center px-4 max-w-md mx-auto",
        className
      )}
    >
      {/* Illustration container */}
      <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center mb-5 shadow-xs relative text-muted-foreground">
        {icon}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-subtle border border-primary/10 flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1 select-none">
        {title}
      </h3>
      
      <p className="text-xs text-muted-foreground leading-relaxed mb-6 select-none">
        {description}
      </p>

      {actions && (
        <div className="flex items-center gap-3 justify-center w-full">
          {actions}
        </div>
      )}
    </div>
  );
}
