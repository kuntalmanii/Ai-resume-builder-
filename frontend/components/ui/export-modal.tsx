/**
 * ExportModal component.
 * Configures resume file naming, layout templates, format outputs, and manages exports.
 */
"use client";

import { useState } from "react";
import { X, FileText, Check, ShieldAlert, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeTitle: string;
  onExport: (format: "pdf" | "docx", fileName: string) => Promise<void>;
  className?: string;
}

export function ExportModal({
  isOpen,
  onClose,
  onResumeTitle,
  onExport,
  className,
}: ExportModalProps) {
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [fileName, setFileName] = useState(
    onResumeTitle.toLowerCase().replace(/\s+/g, "_")
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const fullFileName = `${fileName}.${format}`;
      await onExport(format, fullFileName);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[92vw] bg-card border border-border rounded-lg shadow-xl z-50 p-5 flex flex-col gap-4 animate-in fade-in-50 zoom-in-95 duration-150",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider select-none">
            Export Resume
          </h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="Close modal">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Format Radio Selection */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Format
            </span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "pdf", label: "PDF Document (.pdf)" },
                { id: "docx", label: "Word Document (.docx)" },
              ].map((opt) => {
                const isSelected = format === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setFormat(opt.id as "pdf" | "docx")}
                    className={cn(
                      "flex items-center justify-between px-3 h-[36px] rounded-sm border text-xs font-semibold cursor-pointer select-none transition-all",
                      isSelected
                        ? "border-primary bg-primary-subtle text-primary"
                        : "border-border hover:bg-muted/50 text-text-secondary"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Name Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              File Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full h-[36px] bg-[#F1F3F6] border border-border rounded-sm px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none">
                .{format}
              </span>
            </div>
          </div>

          {/* ATS Safe Tag Alert */}
          <div className="flex gap-2.5 bg-accent-subtle border border-accent/20 rounded-md p-3">
            <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                ATS-Safe Format
              </span>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                This resume layout generates a structured document readable by standard Applicant Tracking Systems without embedded vectors or image overlays.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border-subtle pt-3 mt-1">
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-[36px] px-4 text-xs font-medium text-text-secondary hover:bg-muted/50 rounded-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isExporting || !fileName.trim()}
            className="h-[36px] px-4 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground rounded-sm flex items-center gap-1.5"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download
          </Button>
        </div>
      </div>
    </>
  );
}
