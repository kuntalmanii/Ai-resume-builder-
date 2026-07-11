/**
 * TemplateSelector component.
 * Renders A4 thumbnails of resume layouts for selection.
 */
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Template {
  id: string;
  name: string;
  description: string;
}

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  className,
}: TemplateSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-4", className)}>
      {templates.map((tpl) => {
        const isSelected = tpl.id === selectedId;

        return (
          <div
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className="flex flex-col gap-2 group cursor-pointer select-none"
          >
            {/* Miniature A4 preview representation */}
            <div
              className={cn(
                "w-full aspect-[210/297] rounded-sm bg-white border flex flex-col gap-2 p-3 transition-all duration-200 shadow-xs relative overflow-hidden",
                isSelected
                  ? "border-primary ring-4 ring-primary/10"
                  : "border-border hover:border-border-strong group-hover:shadow-sm"
              )}
            >
              {/* Mock Resume Structure in Thumbnail */}
              <div className="w-[40%] h-2 bg-text-secondary/20 rounded-xs mx-auto mb-1" />
              <div className="w-[60%] h-1 bg-text-muted/15 rounded-xs mx-auto mb-2" />
              
              <div className="h-[1px] bg-border/40 w-full mb-2" />
              
              {/* Sections Mock */}
              {[1, 2].map((sec) => (
                <div key={sec} className="space-y-1.5 mb-2">
                  <div className="w-[30%] h-1.5 bg-primary/20 rounded-xs" />
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-text-muted/10 rounded-xs" />
                    <div className="w-[85%] h-1 bg-text-muted/10 rounded-xs" />
                    <div className="w-[50%] h-1 bg-text-muted/10 rounded-xs" />
                  </div>
                </div>
              ))}

              {tpl.id === "modern" && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-full flex items-start justify-end p-1 select-none">
                  <span className="text-[7px] font-bold text-primary">AI</span>
                </div>
              )}

              {/* Selection Dot Overlay */}
              <div className="absolute bottom-2 right-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-white border-border-strong text-transparent"
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            <div className="px-0.5">
              <h5 className={cn(
                "text-xs font-semibold leading-tight",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {tpl.name}
              </h5>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate leading-none">
                {tpl.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
