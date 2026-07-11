/**
 * Evidence Panel component.
 * Slides in from the right to show backing evidence or unverified claim details.
 */
"use client";

import { X, FileText, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EvidenceItem {
  type: "resume" | "profile" | "unverified";
  title: string;
  content: string;
}

interface EvidencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  evidenceItems: EvidenceItem[];
  className?: string;
}

export function EvidencePanel({
  isOpen,
  onClose,
  title = "Evidence Panel",
  evidenceItems,
  className,
}: EvidencePanelProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[360px] max-w-full bg-card border-l-2 border-border z-50 shadow-xl flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="h-[56px] border-b border-border px-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider select-none">
            {title}
          </h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="Close panel">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Why was this suggested?
            </span>
            <p className="text-xs text-text-secondary leading-relaxed">
              We cross-referenced your current resume against your verified career profile history to check for accurate details.
            </p>
          </div>

          <div className="space-y-4">
            {evidenceItems.map((item, idx) => {
              const isUnverified = item.type === "unverified";
              const isResume = item.type === "resume";

              return (
                <div key={idx} className="space-y-1.5">
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 select-none",
                      isUnverified ? "text-warning" : "text-muted-foreground"
                    )}
                  >
                    {isUnverified && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                    {isResume && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                    {!isUnverified && !isResume && <User className="w-3.5 h-3.5 text-muted-foreground" />}
                    {item.title}
                  </span>

                  <div
                    className={cn(
                      "p-3 rounded-xs border text-xs leading-relaxed font-mono",
                      isUnverified
                        ? "bg-warning-subtle border-warning/30 text-warning"
                        : "bg-[#F1F3F6] border-border/40 text-text-secondary"
                    )}
                  >
                    {item.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
