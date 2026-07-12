"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Eye, Check, ShieldCheck } from "lucide-react";
import { mockTemplates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("modern");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const handleUseTemplate = (templateId: string) => {
    toast.success(`Selected template: "${templateId}". Launching editor...`);
    router.push(`/resumes/resume-new/edit?template=${templateId}`);
  };

  const filteredTemplates = mockTemplates.filter((t) =>
    activeFilter === "all" ? true : t.category === activeFilter
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Resume Templates Gallery"
        description="Choose from our collection of ATS-safe layouts designed to pass corporate parser screeners."
      />

      {/* Categories Filter bar */}
      <div className="flex gap-2 border-b border-border pb-3 bg-transparent p-1 rounded-lg">
        {["all", "classic", "modern", "minimal"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-md transition-colors capitalize",
              activeFilter === cat
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                "flex flex-col h-full border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group cursor-pointer",
                isSelected ? "border-primary ring-1 ring-primary" : "border-border"
              )}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              {/* Visual document mockup card header */}
              <div className="h-44 bg-muted/30 border-b border-border flex items-center justify-center p-6 relative">
                <FileText className="w-16 h-16 text-muted-foreground/30 group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ATS Safe</span>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary text-white p-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-foreground">{template.name}</CardTitle>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 mt-auto flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info(`Previewing ${template.name} template...`);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-semibold h-9 border-border"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  <span>Preview</span>
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template.id);
                  }}
                  size="sm"
                  className="flex-1 text-xs font-semibold h-9"
                >
                  Use layout
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
