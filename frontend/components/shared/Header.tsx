/**
 * Fullscreen editor header bar.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  initialTitle: string;
  onSave?: () => void;
  onExport?: () => void;
  isSaving?: boolean;
}

export function Header({
  initialTitle,
  onSave,
  onExport,
  isSaving = false,
}: HeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="h-[56px] border-b border-border bg-card px-4 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center gap-3">
        <Link href="/resumes">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Back to resumes">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <span className="text-border-strong select-none">|</span>
        
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditing(false);
            }}
            autoFocus
            className="text-base font-medium text-foreground bg-transparent border-b border-primary outline-none px-1 py-0.5 max-w-[240px]"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className="text-base font-medium text-foreground cursor-pointer hover:bg-muted/50 px-2 py-0.5 rounded transition-colors truncate max-w-[240px]"
            title="Click to rename"
          >
            {title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Auto-save Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>{isSaving ? "Saving..." : "Auto-saved"}</span>
        </div>

        <div className="flex items-center gap-2">
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="h-[36px] px-4 text-xs font-medium border-border hover:bg-muted/50"
            >
              Save
            </Button>
          )}
          {onExport && (
            <Button
              size="sm"
              onClick={onExport}
              className="h-[36px] px-4 text-xs font-medium bg-primary hover:bg-primary/95 text-primary-foreground"
            >
              Export PDF
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
