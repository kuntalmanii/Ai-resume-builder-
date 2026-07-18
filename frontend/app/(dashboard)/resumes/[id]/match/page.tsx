"use client";

import React, { useState, useEffect, use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { toast } from "sonner";
import { 
  Target, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  RotateCw,
  Info,
  Briefcase,
  History,
  FileText
} from "lucide-react";
import { jobDescriptionsAPI, jobMatchesAPI, resumesAPI } from "@/lib/api";
import type { JobDescription, JobMatchResultResponse, Resume } from "@/types";

export default function ResumeMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const [resume, setResume] = useState<Resume | null>(null);
  
  // Job Description form states
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jdText, setJdText] = useState("");
  
  // Saved JDs list
  const [savedJds, setSavedJds] = useState<JobDescription[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  
  // Matching operation states
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingJd, setIsSavingJd] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResultResponse | null>(null);
  const [matchHistory, setMatchHistory] = useState<JobMatchResultResponse[]>([]);
  
  // Fetch initial data (Resume, Saved JDs, and Latest Match)
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Get Resume
        const res = await resumesAPI.get(resumeId);
        setResume(res);

        // Get saved JDs
        const jds = await jobDescriptionsAPI.list();
        setSavedJds(jds);

        // Try getting latest match
        try {
          const latest = await jobMatchesAPI.getLatest(resumeId);
          setMatchResult(latest);
          
          // Populate form if latest match exists
          const matchedJd = jds.find(j => j.id === latest.job_description_id);
          if (matchedJd) {
            setJobTitle(matchedJd.title);
            setCompany(matchedJd.company);
            setJdText(matchedJd.raw_text);
            setSelectedJdId(matchedJd.id);
          }
        } catch {
          // No match yet
        }

        // Get history
        try {
          const hist = await jobMatchesAPI.getHistory(resumeId, 1, 5);
          setMatchHistory(hist);
        } catch {}

      } catch (err) {
        toast.error("Failed to load matching workspace data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [resumeId]);

  // Load selected Job Description details
  const handleSelectJd = (id: string) => {
    setSelectedJdId(id);
    if (!id) {
      setJobTitle("");
      setCompany("");
      setJdText("");
      return;
    }
    const jd = savedJds.find(j => j.id === id);
    if (jd) {
      setJobTitle(jd.title);
      setCompany(jd.company);
      setJdText(jd.raw_text);
    }
  };

  // Run the matching comparison pipeline
  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim() || jdText.trim().length < 50) {
      toast.error("Please enter a more detailed job description (minimum 50 characters).");
      return;
    }

    try {
      setIsMatching(true);
      
      let targetJdId = selectedJdId;
      
      // If no saved JD selected or form was modified, create a new one
      const currentJd = savedJds.find(j => j.id === selectedJdId);
      const wasModified = !currentJd || 
                          currentJd.raw_text !== jdText || 
                          currentJd.title !== jobTitle || 
                          currentJd.company !== company;
                          
      if (wasModified) {
        setIsSavingJd(true);
        const newJd = await jobDescriptionsAPI.create({
          title: jobTitle.trim() || "Untitled Role",
          company: company.trim() || "Target Company",
          raw_text: jdText.trim()
        });
        targetJdId = newJd.id;
        setSelectedJdId(newJd.id);
        
        // Refresh saved JDs
        const updatedJds = await jobDescriptionsAPI.list();
        setSavedJds(updatedJds);
        setIsSavingJd(false);
      }

      toast.loading("Analyzing match requirements...", { id: "match-toast" });
      const result = await jobMatchesAPI.run(resumeId, targetJdId, true);
      setMatchResult(result);
      
      // Refresh history
      const hist = await jobMatchesAPI.getHistory(resumeId, 1, 5);
      setMatchHistory(hist);
      
      toast.success("Job description match report generated!", { id: "match-toast" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to complete matching calculation", { id: "match-toast" });
    } finally {
      setIsMatching(false);
      setIsSavingJd(false);
    }
  };

  // Re-run matching for the current Job Description
  const handleReRun = async () => {
    if (!matchResult) return;
    try {
      setIsMatching(true);
      toast.loading("Re-running comparison...", { id: "match-toast" });
      const result = await jobMatchesAPI.run(resumeId, matchResult.job_description_id, true);
      setMatchResult(result);
      
      // Refresh history
      const hist = await jobMatchesAPI.getHistory(resumeId, 1, 5);
      setMatchHistory(hist);
      toast.success("Match report updated successfully!", { id: "match-toast" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update match result", { id: "match-toast" });
    } finally {
      setIsMatching(false);
    }
  };

  // Format Helper for Category names
  const formatCategoryName = (cat: string) => {
    return cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse p-4">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-2/3 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-muted rounded lg:col-span-1" />
          <div className="h-96 bg-muted rounded lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Job Description Matcher"
        description="Compare your resume against target roles to identify critical skill gaps, keyword opportunities, and profile alignments."
        backLink="/resumes"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Side: JD Paste & Selection Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground">Select Job Description</h3>
              <p className="text-[11px] text-muted-foreground">Select a previously saved role or paste a new one below.</p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="saved-jd" className="text-xs font-semibold">Saved Job Descriptions</Label>
                <select
                  id="saved-jd"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary outline-none"
                  value={selectedJdId}
                  onChange={(e) => handleSelectJd(e.target.value)}
                  disabled={isMatching}
                >
                  <option value="">-- Paste New Job Description --</option>
                  {savedJds.map(jd => (
                    <option key={jd.id} value={jd.id}>
                      {jd.company} - {jd.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border/80"></div>
                <span className="flex-shrink mx-2 text-[10px] text-muted-foreground uppercase font-bold">Or enter details</span>
                <div className="flex-grow border-t border-border/80"></div>
              </div>

              <form onSubmit={handleMatch} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="job-title" className="text-xs font-semibold">Job Title</Label>
                  <Input
                    id="job-title"
                    placeholder="e.g. Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="text-xs h-9"
                    disabled={isMatching}
                  />
                </div>

                <div className="space-y-1">
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

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="jd-text" className="text-xs font-semibold">Job Description Text</Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {jdText.length} characters
                    </span>
                  </div>
                  <Textarea
                    id="jd-text"
                    placeholder="Paste the target job description requirements here (minimum 50 characters)..."
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
                      {isSavingJd ? "Saving Role..." : "Analyzing Match..."}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Analyze Match Score
                    </>
                  )}
                </Button>
              </form>
            </div>
          </Card>

          {/* History Panel */}
          {matchHistory.length > 0 && (
            <Card className="border border-border shadow-sm bg-card p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Recent Match History
              </h4>
              <div className="space-y-2">
                {matchHistory.map((h, idx) => {
                  const matchedJd = savedJds.find(j => j.id === h.job_description_id);
                  return (
                    <div key={h.id || idx} className="flex justify-between items-center text-xs p-2 border border-border/50 rounded-md bg-muted/10">
                      <div className="truncate pr-2">
                        <span className="font-semibold text-foreground block truncate">
                          {matchedJd?.title || "Product Role"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {matchedJd?.company || "Company"} • v{h.resume_version}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md border border-primary/20 shrink-0">
                        {h.overall_match_percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Side: Matches, Gaps, Recommendations, and Methodology */}
        <div className="lg:col-span-2 space-y-6">
          {matchResult ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Header Overview Card */}
              <Card className="border border-border shadow-sm bg-card p-6 flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
                <div className="flex items-center gap-6">
                  {/* Scores Display */}
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-18 h-18 rounded-full bg-primary/10 flex flex-col items-center justify-center text-primary font-bold border border-primary/35 shrink-0">
                        <span className="text-2xl leading-none">{matchResult.overall_match_percentage}%</span>
                        <span className="text-[8px] text-primary/70 uppercase font-bold mt-0.5">Current</span>
                      </div>
                    </div>
                    
                    {/* Calculate potential overall percentage from confirmed opportunities */}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex flex-col items-center justify-center text-emerald-500 font-bold border border-emerald-500/20 shrink-0">
                        <span className="text-lg leading-none">
                          {/* If potential matches exist, we fetch it, or show overall match percentage */}
                          {matchResult.hidden_profile_matches && matchResult.hidden_profile_matches.length > 0 
                            ? Math.min(100, matchResult.overall_match_percentage + Math.round(matchResult.hidden_profile_matches.length * 3.5))
                            : matchResult.overall_match_percentage
                          }%
                        </span>
                        <span className="text-[7px] text-emerald-500/70 uppercase font-bold mt-0.5">Potential</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {matchResult.overall_match_percentage >= 80 ? "Excellent Match Strength!" : 
                         matchResult.overall_match_percentage >= 60 ? "Good Candidate Alignment" : 
                         "Needs Alignment Work"}
                      </h4>
                      {matchResult.is_stale && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wide flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Stale
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                      Current measures what's present in this resume (v{matchResult.resume_version}). Potential includes relevant confirmed profile experience.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-semibold h-8 border-border" 
                    onClick={handleReRun}
                    disabled={isMatching}
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                    Re-run Comparison
                  </Button>
                </div>
              </Card>

              {/* Dynamic Warning for AI Fallback */}
              {matchResult.ai_fallback_active && (
                <div className="p-3 border border-amber-500/20 rounded-lg bg-amber-500/5 text-amber-600 text-xs flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Semantic matching was unavailable.</span> This result uses exact and normalized matching only. Gaps and keyword details are fully deterministic.
                  </div>
                </div>
              )}

              {/* Dynamic Categories breakdown */}
              <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Score Breakdown by Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* We map the category scores */}
                  {[
                    { key: "required_skills", title: "Required Skills", score: matchResult.required_skills_score, max: 30 },
                    { key: "preferred_skills", title: "Preferred Skills", score: matchResult.preferred_skills_score, max: 10 },
                    { key: "experience", title: "Relevant Experience", score: matchResult.experience_score, max: 25 },
                    { key: "responsibilities", title: "Responsibilities", score: matchResult.semantic_match_score, max: 15 },
                    { key: "keywords", title: "Keywords & Tools", score: matchResult.keyword_score, max: 10 },
                    { key: "education_certification", title: "Education & Certifications", score: matchResult.education_certification_score, max: 10 }
                  ].map((cat) => {
                    const pct = cat.max > 0 ? Math.round((cat.score / cat.max) * 100) : 0;
                    return (
                      <div key={cat.key} className="space-y-1.5 p-3 border border-border/40 rounded-lg bg-muted/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-foreground">{cat.title}</span>
                          <span className="font-bold text-muted-foreground">
                            {cat.score} / {cat.max} pts
                          </span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Skill Match Details Grid */}
              <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Requirements Scanner & Alignment</h4>
                
                {/* Match Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {matchResult.matched_requirements.map((m, idx) => (
                    <div key={idx} className="p-3 border border-border/80 rounded-lg bg-card text-center space-y-2 flex flex-col justify-between">
                      <span className="text-xs font-bold text-foreground truncate block" title={m.requirement_text}>
                        {m.requirement_text}
                      </span>
                      <div className="flex items-center justify-center">
                        {m.match_type === "exact_match" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">Exact Match</span>
                        )}
                        {m.match_type === "alias_match" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">Alias Match</span>
                        )}
                        {m.match_type === "semantic_match" && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold uppercase">Semantic Match</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Missing requirements */}
                  {matchResult.missing_requirements.map((g, idx) => (
                    <div key={idx} className="p-3 border border-destructive/20 rounded-lg bg-destructive/5 text-center space-y-2 flex flex-col justify-between">
                      <span className="text-xs font-bold text-foreground truncate block" title={g.requirement_text}>
                        {g.requirement_text}
                      </span>
                      <div className="flex items-center justify-center">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-destructive/10 text-destructive border border-destructive/25 font-bold uppercase">Missing</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Hidden Career Profile Opportunities & Detailed Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Opportunities found in Smart Career Profile */}
                <Card className="border border-primary border-l-4 shadow-sm bg-card p-5 space-y-4">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Career Profile Opportunities
                  </h4>
                  
                  {matchResult.hidden_profile_matches && matchResult.hidden_profile_matches.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-foreground leading-snug">
                        We found relevant skills in your Career Profile that are missing from this resume:
                      </p>
                      <div className="space-y-2.5">
                        {matchResult.hidden_profile_matches.map((opp, idx) => (
                          <div key={idx} className="p-2.5 border border-border/80 rounded-md bg-muted/5 space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-foreground">{opp.requirement_text}</span>
                              <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.2 border border-emerald-500/20 rounded uppercase">
                                {opp.verification_status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Stored in {opp.entry_type.replace("_", " ")}: <span className="font-semibold text-foreground">{opp.title}</span> ({opp.organization})
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      No additional missing skills found in your Career Profile. Keep your profile updated to unlock opportunities!
                    </p>
                  )}
                </Card>

                {/* Recommendations */}
                <Card className="border border-border shadow-sm bg-card p-5 space-y-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-foreground" /> Priority Recommendations
                  </h4>
                  <div className="space-y-3">
                    {matchResult.recommendations && matchResult.recommendations.length > 0 ? (
                      matchResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                          <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-[11px] text-foreground leading-relaxed">{rec}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Great alignment! No major recommendations needed.
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Methodology Explainer */}
              <Card className="border border-border shadow-sm bg-card p-5 space-y-3 bg-muted/5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">How is Job Match calculated?</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  We parse requirement criteria (required/preferred skills, certifications, experience, and responsibilities) directly from the Job Description. The score is calculated using structured matching parameters:
                </p>
                <ul className="text-[10px] text-muted-foreground list-disc pl-4 space-y-1">
                  <li><span className="font-semibold text-foreground">Exact / Alias Match:</span> Full points are awarded when the skill name or a standard alias matches your resume.</li>
                  <li><span className="font-semibold text-foreground">Semantic Match:</span> Partial points are awarded when your experience matches the requirement contextually (e.g. backend endpoints matching REST APIs).</li>
                  <li><span className="font-semibold text-foreground">Dynamic Normalization:</span> Category scores are dynamically adjusted. Gaps in preferred sections or missing categories are normalized so you are never penalized for requirements the job description omitted.</li>
                  <li><span className="font-semibold text-foreground">AI Guardrails:</span> AI never assigns final scores directly. Scores are calculated deterministically by our scoring engine.</li>
                </ul>
              </Card>

            </div>
          ) : (
            <Card className="border border-border border-dashed shadow-xs bg-muted/5 h-[350px] flex flex-col items-center justify-center text-center p-6 select-none">
              <Target className="w-12 h-12 text-muted-foreground/40 mb-3 animate-pulse" />
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-foreground">Run Match Comparison</h4>
                <p className="text-xs text-muted-foreground">
                  Paste the job requirements on the left to analyze alignment, calculate scores, and uncover hidden career opportunities.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
