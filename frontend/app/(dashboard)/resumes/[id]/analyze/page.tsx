"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AtsScoreRing, CategoryScoreBar } from "@/components/ui/ats-score";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { toast } from "sonner";
import { FileText, Target, Sparkles, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { mockAnalysisResult } from "@/lib/mock-data";

export default function ResumeAnalyzePage({ params }: { params: { id: string } }) {
  const [activeCategory, setActiveCategory] = useState<string>("ats");

  const activeData = mockAnalysisResult.categories.find((c) => c.id === activeCategory) || mockAnalysisResult.categories[0];

  const handleRefresh = () => {
    toast.success("Refreshing ATS analysis parameters...");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="ATS Score Analysis"
        description="Comprehensive checker scorecard displaying ATS warnings, errors, and point deductions."
        backLink="/resumes"
        action={
          <Button onClick={handleRefresh} variant="outline" size="sm" className="h-9 border-border text-xs font-semibold gap-1.5 bg-card">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Score</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Side: Score Summary Wheel & Categories */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card p-6 flex flex-col items-center justify-center text-center">
            <AtsScoreRing score={mockAnalysisResult.overallScore} size="lg" />
            <div className="mt-5 space-y-1">
              <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Good score range</span>
              </span>
              <p className="text-[10px] text-muted-foreground">Aim for 85+ to pass strict enterprise filters.</p>
            </div>
          </Card>

          {/* Categories select list */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Score Breakdown Categories</h4>
            <div className="space-y-1.5">
              {mockAnalysisResult.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left p-3 border rounded-lg transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary-subtle border-primary/20 shadow-xs"
                      : "border-border hover:bg-card bg-card"
                  }`}
                >
                  <CategoryScoreBar
                    label={cat.title}
                    score={Math.round((cat.score / cat.maxScore) * 100)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Category Detailed Report & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border shadow-sm bg-card h-full min-h-[450px]">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-foreground">
                  {activeData.title} Report
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  View structural errors, warnings, and performance point deductions.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">{activeData.score}</span>
                <span className="text-xs text-muted-foreground font-semibold">/{activeData.maxScore} pts</span>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Passed / Warns Count summary */}
              <div className="grid grid-cols-3 gap-3 border border-border/60 rounded-lg p-3 bg-muted/5">
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Passed</span>
                  <span className="text-sm font-bold text-emerald-500">{activeData.passedChecks} checks</span>
                </div>
                <div className="text-center space-y-0.5 border-x border-border/60">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Warnings</span>
                  <span className="text-sm font-bold text-amber-500">{activeData.warnings} alerts</span>
                </div>
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Failed</span>
                  <span className="text-sm font-bold text-destructive">{activeData.failedChecks} errors</span>
                </div>
              </div>

              {/* Point Deductions */}
              {activeData.pointDeductions.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Point Deductions Found</h4>
                  <div className="space-y-1.5">
                    {activeData.pointDeductions.map((ded, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-md border border-destructive/20 bg-destructive/5 text-xs">
                        <span className="text-foreground font-medium">{ded.reason}</span>
                        <span className="font-bold text-destructive">-{ded.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 rounded-md font-semibold">
                  <CheckCircleIcon className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  No point deductions found for this category. Excellent!
                </div>
              )}

              {/* Recommendations list */}
              {activeData.recommendations && activeData.recommendations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actionable Recommendations</h4>
                  <div className="space-y-3">
                    {activeData.recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 border border-border rounded-lg bg-card space-y-2.5 shadow-xs relative">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-foreground">{rec.title}</span>
                          <SeverityBadge status={rec.impact === "high" ? "failed" : "warning"} />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {rec.description}
                        </p>
                        <div className="bg-muted/40 p-2.5 rounded text-[11px] text-foreground border-l-2 border-l-primary leading-relaxed font-semibold">
                          <strong className="text-primary font-bold">Action: </strong>
                          {rec.actionableText}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
