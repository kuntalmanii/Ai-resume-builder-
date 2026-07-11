/**
 * Reusable Stepper component for multi-step wizards.
 */
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {steps.map((step, idx) => {
          const isComplete = idx < currentStep;
          const isActive = idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <div key={step.label} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                    isComplete && "bg-accent text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isPending && "bg-card border border-border text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-6 text-[11px] font-medium whitespace-nowrap select-none",
                    isActive && "text-foreground font-semibold",
                    isComplete && "text-accent",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-[2px] mx-2 transition-all duration-500",
                    isComplete ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Spacer to account for absolute labels */}
      <div className="h-6" />
    </div>
  );
}
