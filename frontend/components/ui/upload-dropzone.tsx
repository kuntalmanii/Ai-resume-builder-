/**
 * UploadDropzone and ParsingProgress components.
 */
"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ──── Parsing Progress Component ────

export interface ParsingStep {
  label: string;
  status: "pending" | "progress" | "done" | "error";
}

interface ParsingProgressProps {
  steps: ParsingStep[];
  fileName?: string;
  className?: string;
}

export function ParsingProgress({ steps, fileName, className }: ParsingProgressProps) {
  return (
    <div className={cn("bg-card border border-border rounded-md p-5 space-y-4 shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="text-sm font-semibold text-foreground">
          Parsing {fileName ?? "resume.pdf"}
        </h4>
        <span className="text-[10px] bg-primary-subtle text-primary border border-primary/10 px-2 py-0.5 rounded-full font-semibold">
          AI Parser
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = step.status === "done";
          const isProgress = step.status === "progress";
          const isError = step.status === "error";

          return (
            <div key={idx} className="flex items-center justify-between h-9 px-3 rounded bg-[#F1F3F6]/50 border border-border/30">
              <div className="flex items-center gap-3">
                {isProgress && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {isDone && <Check className="w-4 h-4 text-accent stroke-[2.5]" />}
                {isError && <AlertCircle className="w-4 h-4 text-error" />}
                {step.status === "pending" && (
                  <span className="w-4 h-4 rounded-full border border-border-strong flex items-center justify-center text-[10px] font-bold text-muted-foreground select-none" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    step.status === "pending" && "text-muted-foreground",
                    (isProgress || isDone) && "text-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide uppercase">
                {isDone && <span className="text-accent">✓ Done</span>}
                {isProgress && <span className="text-primary animate-pulse">In progress</span>}
                {isError && <span className="text-error">Error</span>}
                {step.status === "pending" && <span className="text-text-muted">Pending</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Upload Dropzone Component ────

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  error?: string | null;
  className?: string;
}

export function UploadDropzone({
  onFileSelect,
  isUploading = false,
  error = null,
  className,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndPropagate(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPropagate(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const validateAndPropagate = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext === ".pdf" || ext === ".docx") {
      onFileSelect(file);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={cn(
          "w-full h-44 rounded-md border-2 border-dashed flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary-subtle"
            : error
            ? "border-error bg-error-subtle"
            : "border-border bg-[#F1F3F6] hover:bg-muted/30"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx"
          className="hidden"
          disabled={isUploading}
        />

        <div className="w-10 h-10 rounded-full bg-card border border-border shadow-xs flex items-center justify-center mb-3">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-text-secondary" />
          )}
        </div>

        <p className="text-sm font-semibold text-foreground">
          {isUploading ? "Uploading resume..." : "Drop your resume here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading ? "Please wait while file uploads" : "or click to browse"}
        </p>
        <p className="text-[10px] text-text-muted mt-3 font-semibold uppercase tracking-wider">
          PDF or DOCX · Max 10 MB
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-error-subtle text-error text-xs rounded-sm border border-red-200/50">
          <AlertCircle className="w-4 h-4 text-error shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
