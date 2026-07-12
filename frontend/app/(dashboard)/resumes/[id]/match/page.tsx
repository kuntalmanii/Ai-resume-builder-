"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { KeywordGrid } from "@/components/ui/keyword-chips";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { toast } from "sonner";
import { Target, Sparkles, AlertTriangle, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { mockKeywordMatches, mockSkillGaps, mockExperienceGaps } from "@/lib/mock-data";

export default function ResumeMatchPage({ params }: { params: { id: string } }) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jdText, setJdText] = useState("");
  
  const [isMatching, setIsMatching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText) {
      toast.error("Please enter a job description to match against");
      return;
    }

    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      setShowResults(true);
      toast.success("Job description match report generated!");
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Job Description Matcher"
        description="Target your resume against a specific job role, identifying skill gaps, keyword matches, and experience alignments."
        backLink="/resumes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Side: Input JD Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card p-5">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-4">Job Details</h3>
            <form onSubmit={handleMatch} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="job-title" className="text-xs font-semibold">Job Title</Label>
                <Input
                  id="job-title"
                  placeholder="e.g. Senior Product Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="text-xs h-9"
                  disabled={isMatching}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold">Company Name</Label>
                <Input
                  id="company"
                  placeholder="e.g. Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="text-xs h-9"
                  disabled={isMatching}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jd-text" className="text-xs font-semibold">Job Description</Label>
                <Textarea
                  id="jd-text"
                  placeholder="Paste the target job description requirements here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={8}
                  className="text-xs resize-none"
                  disabled={isMatching}
                  required
                />
              </div>

              <Button type="submit" className="w-full text-xs font-semibold h-9" disabled={isMatching}>
                {isMatching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Match...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Compare Resume
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Matches, Gaps, and Hidden Experiences */}
        <div className="lg:col-span-2 space-y-6">
          {showResults ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* Overall Match Circle */}
              <Card className="border border-border shadow-sm bg-card p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-primary font-bold text-xl border border-primary/20 shrink-0">
                    84%
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">Good Match Strength</h4>
                    <p className="text-xs text-muted-foreground">Your resume matches 84% of the target job description requirements.</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-emerald-500 font-semibold text-xs bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Passed screening checks
                </div>
              </Card>

              {/* Keywords Alignment chips */}
              <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">JD Keywords & Skills Scanners</h4>
                {/* We map the mock keyword matches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mockKeywordMatches.map((m, idx) => (
                    <div key={idx} className="p-3 border border-border/80 rounded-lg bg-card text-center space-y-2">
                      <span className="text-xs font-bold text-foreground truncate block">{m.keyword}</span>
                      <div className="flex items-center justify-center">
                        {m.matchType === "exact_match" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">Exact Match</span>
                        )}
                        {m.matchType === "semantic_match" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold uppercase">Semantic</span>
                        )}
                        {m.matchType === "missing" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-destructive/10 text-destructive border border-destructive/20 font-bold uppercase">Missing</span>
                        )}
                        {m.matchType === "optional" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-muted text-muted-foreground border border-border font-bold uppercase">Optional</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gaps detected & Smart Profile additions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skill & Experience Gaps */}
                <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Identified Gaps</h4>
                  <div className="space-y-3">
                    {mockSkillGaps.map((gap, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-foreground">{gap.skill}</span>
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Skill Gap</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{gap.recommendation}</p>
                      </div>
                    ))}
                    {mockExperienceGaps.map((gap, idx) => (
                      <div key={idx} className="space-y-1 border-t border-border/50 pt-2.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-foreground">{gap.requirement}</span>
                          <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">Experience Gap</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{gap.details} (Missing {gap.gapYears} years)</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Evidence Mode: Hidden profile information found! */}
                <Card className="border border-border border-l-4 border-l-primary shadow-sm bg-card p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-primary bg-primary-subtle p-1 rounded-md">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Evidence Finder Suggestion</h4>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground leading-snug">
                      Relevant skills found in your Career Profile, but missing from this resume:
                    </p>
                    <div className="flex flex-wrap gap-1.5 py-1">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">AWS Certified Developer</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">Webpack</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">GraphQL</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      You can easily append these verified milestones using the AI suggestions center to immediately bolster match score by +12%.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border border-border border-dashed shadow-xs bg-muted/5 h-[350px] flex flex-col items-center justify-center text-center p-6 select-none">
              <Target className="w-12 h-12 text-muted-foreground/40 mb-3 animate-pulse" />
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-foreground">Waiting for Job Details</h4>
                <p className="text-xs text-muted-foreground">
                  Paste the requirements of the job description on the left to analyze keyword coverage and verify skill alignment.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
