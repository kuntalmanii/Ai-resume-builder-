"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIComparisonCard } from "@/components/ui/ai-comparison-card";
import { toast } from "sonner";
import { Sparkles, Check, X, Undo2, Award, ShieldAlert } from "lucide-react";
import { mockAISuggestions } from "@/lib/mock-data";
import type { ClientAISuggestion } from "@/types";

export default function ResumeImprovePage({ params }: { params: { id: string } }) {
  const [suggestions, setSuggestions] = useState<ClientAISuggestion[]>(mockAISuggestions);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const handleAccept = (id: string, text: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
    setAcceptedCount((prev) => prev + 1);
    toast.success("AI suggestion successfully merged into resume content!");
  };

  const handleReject = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id));
    toast.info("Suggestion rejected.");
  };

  const handleReset = () => {
    setSuggestions(mockAISuggestions);
    setAcceptedCount(0);
    toast.success("AI suggestions reloaded.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="AI Improvement Workspace"
        description="Verify AI-inferred suggestions and evidence mode indicators to safely audit resume metrics."
        backLink="/resumes"
        action={
          suggestions.length === 0 ? (
            <Button onClick={handleReset} variant="outline" size="sm" className="h-9 border-border text-xs font-semibold gap-1.5 bg-card">
              <Undo2 className="w-4 h-4" />
              <span>Reset suggestions</span>
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
        {/* Left Side: Summary Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">Workspace Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Pending Audit</span>
                <span className="text-sm font-bold text-foreground">{suggestions.length} cards</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-border/50 pt-2.5">
                <span className="text-xs text-muted-foreground">Merged Changes</span>
                <span className="text-sm font-bold text-emerald-500">+{acceptedCount} suggestions</span>
              </div>
            </div>
          </Card>

          <Card className="border border-border border-l-4 border-l-primary shadow-sm bg-card p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-primary bg-primary-subtle p-0.5 rounded-full">
              <Award className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Evidence Mode</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every improvement check is run against verified milestones inside your Career Profile to ensure no artificial metrics are fabricated.
            </p>
          </Card>
        </div>

        {/* Right Side: Suggestions List */}
        <div className="lg:col-span-3 space-y-5">
          {suggestions.length > 0 ? (
            <div className="space-y-5">
              {suggestions.map((sug) => (
                <div key={sug.id} className="animate-in fade-in duration-300">
                  <AIComparisonCard
                    id={sug.id}
                    originalText={sug.originalContent}
                    suggestedText={sug.suggestedContent}
                    confidence={sug.confidence}
                    unverifiedClaim={sug.verificationStatus === "unverified" ? sug.unverifiedClaims[0] : undefined}
                    evidence={sug.evidenceSources.map((ev) => ({
                      item: ev.label,
                      source: ev.sourceType,
                    }))}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onEdit={(id) => toast.info(`Manual editing suggestion is not implemented yet.`)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border border-border border-dashed shadow-xs bg-muted/5 h-[300px] flex flex-col items-center justify-center text-center p-6 select-none">
              <Check className="w-12 h-12 text-emerald-500 bg-emerald-500/10 p-2.5 rounded-full mb-3" />
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-foreground">Workspace Clear!</h4>
                <p className="text-xs text-muted-foreground">
                  You have reviewed all pending suggestions. All accepted items have been successfully merged into your draft.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
