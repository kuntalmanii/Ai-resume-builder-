"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  Check,
  X,
  Award,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Edit3,
  CornerDownRight,
  Activity,
  History
} from "lucide-react";
import { resumesAPI, suggestionsAPI, SuggestionResponse, AIStatusResponse } from "@/lib/api";
import type { Resume, ResumeClaim, EvidenceMapResponse } from "@/types";

export default function ResumeImprovePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const resumeId = params.id;

  const [resume, setResume] = useState<Resume | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResponse[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);

  // Evidence Map state
  const [claims, setClaims] = useState<ResumeClaim[]>([]);
  const [credibilityScore, setCredibilityScore] = useState<number | null>(null);
  const [auditingClaims, setAuditingClaims] = useState(false);

  // Generation Panel state
  const [generating, setGenerating] = useState(false);
  const [targetSection, setTargetSection] = useState("experience");
  const [suggestionType, setSuggestionType] = useState("bullet_enhancement");
  const [customInstruction, setCustomInstruction] = useState("");
  const [batchMode, setBatchMode] = useState("full_audit");

  // Interaction states per suggestion ID
  const [answeringState, setAnsweringState] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<Record<string, boolean>>({});
  const [editingState, setEditingState] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [revalidating, setRevalidating] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [resumeId]);

  const fetchData = async () => {
    setLoadingSuggestions(true);
    try {
      const [res, suggs, health, evidenceRes] = await Promise.all([
        resumesAPI.get(resumeId),
        suggestionsAPI.list(resumeId),
        suggestionsAPI.getHealth(),
        resumesAPI.getClaims(resumeId).catch(() => ({ claims: [], evidence_credibility_score: null }))
      ]);
      setResume(res);
      // Filter out rejected or applied suggestions to keep workspace clean
      setSuggestions(suggs.filter((s) => s.status !== "rejected" && s.status !== "applied"));
      setAiStatus(health);
      if (evidenceRes && evidenceRes.claims) {
        setClaims(evidenceRes.claims);
        setCredibilityScore(evidenceRes.evidence_credibility_score);
      }
    } catch (error) {
      toast.error("Failed to load AI workspace data.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAuditClaims = async () => {
    setAuditingClaims(true);
    try {
      const res = await resumesAPI.auditClaims(resumeId);
      setClaims(res.claims);
      setCredibilityScore(res.evidence_credibility_score);
      toast.success("Resume claims audited successfully!");
    } catch (error) {
      toast.error("Failed to audit claims.");
    } finally {
      setAuditingClaims(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Find a matching entry ID to target (experience, projects) if applicable
      let targetEntryId = undefined;
      const content = resume?.content;
      if (content) {
        if (targetSection === "experience" && content.experience && content.experience.length > 0) {
          targetEntryId = (content.experience[0] as any).id;
        } else if (targetSection === "projects" && content.projects && content.projects.length > 0) {
          targetEntryId = (content.projects[0] as any).id;
        }
      }

      await suggestionsAPI.generate(resumeId, {
        suggestion_type: suggestionType,
        target_section: targetSection,
        target_entry_id: targetEntryId,
        target_field: targetSection === "professional_summary" ? "professional_summary" : "bullets",
        target_index: targetSection === "professional_summary" ? undefined : 0,
        instruction: customInstruction
      });

      toast.success("AI suggestion generated successfully!");
      setCustomInstruction("");
      // Refresh suggestions
      const freshSuggs = await suggestionsAPI.list(resumeId);
      setSuggestions(freshSuggs.filter((s) => s.status !== "rejected" && s.status !== "applied"));
    } catch (error) {
      toast.error("Failed to generate AI suggestion.");
    } finally {
      setGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    setGenerating(true);
    try {
      await suggestionsAPI.batchGenerate(resumeId, {
        mode: batchMode,
        max_suggestions: 5
      });
      toast.success("Batch audit completed! New suggestions loaded.");
      const freshSuggs = await suggestionsAPI.list(resumeId);
      setSuggestions(freshSuggs.filter((s) => s.status !== "rejected" && s.status !== "applied"));
    } catch (error) {
      toast.error("Failed to execute batch AI audit.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await suggestionsAPI.accept(resumeId, id);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "accepted" } : s))
      );
      toast.success("Suggestion accepted. Ready to apply!");
    } catch (error) {
      toast.error("Failed to accept suggestion.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await suggestionsAPI.reject(resumeId, id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.info("Suggestion rejected.");
    } catch (error) {
      toast.error("Failed to reject suggestion.");
    }
  };

  const handleEdit = (id: string, text: string) => {
    setIsEditing((prev) => ({ ...prev, [id]: true }));
    setEditingState((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveEdit = async (id: string) => {
    setRevalidating((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await suggestionsAPI.edit(resumeId, id, editingState[id]);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setIsEditing((prev) => ({ ...prev, [id]: false }));
      toast.success("Suggestion updated and re-validated!");
    } catch (error) {
      toast.error("Failed to validate edit.");
    } finally {
      setRevalidating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAnswerQuestion = async (id: string) => {
    const answer = answeringState[id];
    if (!answer?.trim()) return;

    setSubmittingAnswer((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await suggestionsAPI.answerQuestion(resumeId, id, answer);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setAnsweringState((prev) => ({ ...prev, [id]: "" }));
      toast.success("Metric verified! AI suggestion regenerated.");
    } catch (error) {
      toast.error("Failed to submit clarification.");
    } finally {
      setSubmittingAnswer((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleApply = async (id: string) => {
    setApplying((prev) => ({ ...prev, [id]: true }));
    try {
      const updatedResume = await suggestionsAPI.apply(resumeId, id);
      setResume(updatedResume);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Success! Suggestions applied, resume updated to version ${updatedResume.version}.`);
    } catch (error: any) {
      if (error?.details === "RESUME_VERSION_CONFLICT") {
        toast.error("Apply failed: The resume has been modified elsewhere since this suggestion was created. Please refresh.");
      } else {
        toast.error("Failed to apply suggestion to resume.");
      }
      fetchData(); // Refresh data to sync version numbers
    } finally {
      setApplying((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-0">Grounded</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-0">User Review</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/15 border-0 font-bold">Unsupported</Badge>;
      case "blocked":
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/15 border-0 font-bold">Contradictory</Badge>;
      default:
        return <Badge variant="outline">{risk}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="AI Improvement Workspace"
        description="Verify AI-inferred suggestions and evidence indicators to safely audit and optimize your resume."
        backLink={`/resumes/${resumeId}/edit`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left Side: Summary & Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <Card className="border border-border shadow-xs bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Resume Metadata</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="w-3.5 h-3.5" />
                <span>v{resume?.version || 1}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground truncate">{resume?.title || "Untitled Resume"}</div>
              <div className="text-xs text-muted-foreground">Draft Status: {(resume as any)?.status || "Draft"}</div>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">AI Integration Status:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${aiStatus?.status === "available" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="font-semibold text-foreground uppercase tracking-wide text-[10px]">
                  {aiStatus?.status === "available" ? `${aiStatus.provider_name} Online` : "Offline"}
                </span>
              </div>
            </div>
          </Card>

          {/* Trigger Single Suggestion */}
          <Card className="border border-border shadow-xs bg-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Ask CareerOS AI</span>
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Section</label>
                <Select value={targetSection} onValueChange={(val) => setTargetSection(val || "experience")}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional_summary">Professional Summary</SelectItem>
                    <SelectItem value="experience">Work Experience</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Optimization Mode</label>
                <Select value={suggestionType} onValueChange={(val) => setSuggestionType(val || "bullet_enhancement")}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullet_enhancement">Enhance Bullet Metrics</SelectItem>
                    <SelectItem value="ats_fix">Optimize for ATS Keywords</SelectItem>
                    <SelectItem value="action_verb_improvement">Inject Action Verbs</SelectItem>
                    <SelectItem value="grammar_correction">Grammar & Conciseness</SelectItem>
                    <SelectItem value="jd_targeted_rewrite">Target Job Description</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Custom Instructions (Optional)</label>
                <Textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. Focus on scalability and Python context..."
                  className="text-xs min-h-[60px]"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || aiStatus?.status !== "available"}
                className="w-full h-9 text-xs font-semibold mt-1"
              >
                {generating ? "Generating..." : "Request AI Recommendation"}
              </Button>
            </div>
          </Card>

          {/* Batch Audit */}
          <Card className="border border-border shadow-xs bg-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-accent" />
              <span>Batch Audit Resume</span>
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Audit Focus</label>
                <Select value={batchMode} onValueChange={(val) => setBatchMode(val || "full_audit")}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_audit">Full Structural Audit</SelectItem>
                    <SelectItem value="ats_driven">ATS score Optimizer</SelectItem>
                    <SelectItem value="jd_targeted">Align with Job Description</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleBatchGenerate}
                disabled={generating || aiStatus?.status !== "available"}
                variant="outline"
                className="w-full h-9 text-xs font-semibold"
              >
                {generating ? "Auditing..." : "Run Batch Diagnostics"}
              </Button>
            </div>
          </Card>

          {/* Evidence Map Trigger */}
          <Card className="border border-border shadow-xs bg-card p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span>Evidence Map</span>
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Extract atomic claims from your resume and cross-reference them against your trusted Career Profile facts to calculate an overall Credibility Score.
                </p>
                {credibilityScore !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Credibility Score:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${credibilityScore >= 80 ? 'bg-emerald-500/10 text-emerald-500' : credibilityScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                      {credibilityScore}%
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleAuditClaims}
                disabled={auditingClaims || aiStatus?.status !== "available"}
                variant="outline"
                className="w-full h-9 text-xs font-semibold"
              >
                {auditingClaims ? "Auditing Claims..." : "Run Evidence Audit"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side: Suggestions stream (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {loadingSuggestions ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse border border-border h-48 bg-card" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Evidence Map Section */}
              {claims.length > 0 && (
                <Card className="border border-primary/20 shadow-sm bg-card p-5 space-y-4 mb-6">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-bold text-foreground tracking-wider">Resume Evidence Map</h3>
                    </div>
                    {credibilityScore !== null && (
                      <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full text-xs font-bold text-primary">
                        Score: {credibilityScore}/100
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {claims.map(claim => (
                      <div key={claim.id} className="bg-muted/10 border border-border/30 rounded p-3 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground font-medium flex-1">"{claim.claim_text}"</p>
                          <div className="shrink-0">
                            {claim.verification_status === "source_verified" || claim.verification_status === "user_confirmed" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-0">Verified</Badge>
                            ) : claim.verification_status === "inferred" ? (
                              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-0">Inferred</Badge>
                            ) : claim.verification_status === "contradictory" ? (
                              <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/15 border-0">Contradictory</Badge>
                            ) : (
                              <Badge variant="outline">Unverified</Badge>
                            )}
                          </div>
                        </div>
                        {claim.contradiction_details && (
                          <p className="text-red-500 text-[10px] mt-1 italic">{claim.contradiction_details}</p>
                        )}
                        {claim.evidence_sources && claim.evidence_sources.length > 0 && (
                          <div className="pt-2 border-t border-border/40 space-y-1">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">Supported By:</span>
                            {claim.evidence_sources.map(ev => (
                              <div key={ev.id} className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-500" /> {ev.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {suggestions.length > 0 ? (
                suggestions.map((sug) => {
                const suggEditing = isEditing[sug.id];
                const suggApplying = applying[sug.id];
                const hasQuestion = sug.evidence_sources.some((ev) => ev.source_type === "clarifying_question");

                return (
                  <Card key={sug.id} className="border border-border shadow-sm bg-card p-5 space-y-4 transition-all hover:border-border-strong relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0 uppercase text-[9px] font-bold tracking-wider">
                          {sug.suggestion_type.replace(/_/g, " ")}
                        </Badge>
                        {getRiskBadge(sug.risk_level)}
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        {sug.expected_score_gain !== null && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full select-none">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{sug.expected_score_gain} Score</span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground">Version context: v{sug.source_resume_version}</span>
                      </div>
                    </div>

                    {/* Side-by-Side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="bg-muted/10 border border-border/30 rounded-xs p-3.5 relative pt-6.5">
                        <span className="absolute top-1.5 left-2.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Original text</span>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{sug.original_text || "(Empty)"}</p>
                      </div>

                      {/* Suggested */}
                      <div className="bg-accent-subtle/5 border border-primary/20 border-l-4 border-l-primary rounded-xs p-3.5 relative pt-6.5">
                        <span className="absolute top-1.5 left-2.5 text-[9px] font-bold text-primary uppercase tracking-wider">Suggested Rewrite</span>
                        {suggEditing ? (
                          <Textarea
                            value={editingState[sug.id] ?? ""}
                            onChange={(e) => setEditingState({ ...editingState, [sug.id]: e.target.value })}
                            className="text-xs min-h-[80px] w-full mt-1.5 bg-card border-primary/40 focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <p className="text-xs text-foreground font-semibold leading-relaxed whitespace-pre-wrap">
                            {sug.status === "edited" ? sug.edited_text : sug.suggested_text}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rationale and Evidence Section */}
                    {sug.rationale && (
                      <div className="space-y-1.5 bg-muted/5 p-3 rounded border border-border/40 text-xs">
                        <div className="font-bold text-foreground">Why this works:</div>
                        <p className="text-muted-foreground leading-relaxed text-[11px]">{sug.rationale}</p>
                      </div>
                    )}

                    {/* Grounded Evidence items */}
                    {sug.evidence_sources.some((ev) => ev.source_type !== "clarifying_question") && (
                      <div className="space-y-2 border-t border-border/40 pt-3">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Grounded Evidence Backing</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {sug.evidence_sources
                            .filter((ev) => ev.source_type !== "clarifying_question")
                            .map((ev) => (
                              <div key={ev.id} className="flex items-center justify-between gap-3 bg-muted/10 border border-border/30 rounded px-2.5 py-1.5 text-[11px]">
                                <span className="text-foreground truncate font-medium">{ev.label}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold shrink-0">
                                  {ev.source_type === "career_profile" ? "👤 profile" : "📄 resume"}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Missing metric: Clarifying Question input */}
                    {hasQuestion && (
                      <div className="bg-amber-500/10 border-l-4 border-l-amber-500 rounded p-3.5 space-y-3 border-y border-r border-amber-200/50">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-foreground">Clarifying Question Required</div>
                            <p className="text-[11px] text-muted-foreground">
                              The AI identified an opportunity to include an achievement metric, but did not find it in your career facts.
                              Please clarify to generate a grounded metric suggestion.
                            </p>
                          </div>
                        </div>
                        {sug.evidence_sources
                          .filter((ev) => ev.source_type === "clarifying_question")
                          .map((ev) => (
                            <div key={ev.id} className="space-y-2.5">
                              <div className="text-xs font-semibold text-foreground italic flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{ev.excerpt || ev.label}</span>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  value={answeringState[sug.id] ?? ""}
                                  onChange={(e) => setAnsweringState({ ...answeringState, [sug.id]: e.target.value })}
                                  placeholder="e.g. 15% increase, lead of 4 engineers..."
                                  className="text-xs h-8.5 bg-card border-amber-300/60 focus-visible:ring-amber-400"
                                />
                                <Button
                                  onClick={() => handleAnswerQuestion(sug.id)}
                                  disabled={submittingAnswer[sug.id] || !answeringState[sug.id]}
                                  className="h-8.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                                >
                                  {submittingAnswer[sug.id] ? "Submitting..." : "Verify Metric"}
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Claims validation warnings */}
                    {sug.claim_validation.some((claim) => claim.support_status === "unsupported" || claim.support_status === "contradictory") && (
                      <div className="bg-red-500/10 border-l-4 border-l-red-500 rounded p-3.5 flex gap-3.5 border-y border-r border-red-200/50">
                        <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0 animate-bounce" />
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-red-500 uppercase tracking-wide text-[10px]">Security Risk Block: Unsupported Claims Detected</div>
                          {sug.claim_validation
                            .filter((claim) => claim.support_status === "unsupported" || claim.support_status === "contradictory")
                            .map((claim, idx) => (
                              <p key={idx} className="text-muted-foreground text-[11px] leading-relaxed">
                                Claim <strong className="text-foreground">"{claim.claim_text}"</strong> is flagged as <span className="font-semibold text-red-500">{claim.support_status}</span>. You cannot apply suggestions with fabricated details.
                              </p>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2 border-t border-border/50 pt-4 mt-2">
                      {suggEditing ? (
                        <>
                          <Button
                            onClick={() => handleSaveEdit(sug.id)}
                            disabled={revalidating[sug.id]}
                            className="h-9 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground"
                          >
                            {revalidating[sug.id] ? "Validating..." : "Save & Re-validate"}
                          </Button>
                          <Button
                            onClick={() => setIsEditing({ ...isEditing, [sug.id]: false })}
                            variant="ghost"
                            className="h-9 text-xs font-semibold px-4 border border-border"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {sug.status === "accepted" ? (
                            <Button
                              onClick={() => handleApply(sug.id)}
                              disabled={suggApplying}
                              className="h-9 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm"
                            >
                              {suggApplying ? "Applying..." : "Apply changes to Resume"}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleAccept(sug.id)}
                              disabled={sug.risk_level === "high" || sug.risk_level === "blocked"}
                              className="h-9 text-xs font-semibold bg-accent hover:bg-accent/90 text-accent-foreground flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </Button>
                          )}

                          <Button
                            onClick={() => handleEdit(sug.id, sug.status === "edited" ? (sug.edited_text ?? "") : sug.suggested_text)}
                            variant="ghost"
                            className="h-9 text-xs font-semibold px-4 border border-border flex items-center gap-1.5 hover:bg-muted/30"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </Button>

                          <Button
                            onClick={() => handleReject(sug.id)}
                            variant="ghost"
                            className="h-9 text-xs font-semibold px-4 border-0 text-red-500 hover:bg-red-500/10 hover:text-red-600 ml-auto flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })
              ) : (
                <Card className="border border-border border-dashed shadow-xs bg-muted/5 h-[340px] flex flex-col items-center justify-center text-center p-6 select-none">
                  <Check className="w-12 h-12 text-emerald-500 bg-emerald-500/10 p-2.5 rounded-full mb-3" />
                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-sm font-bold text-foreground">Improvement Workspace Clean!</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You have reviewed and processed all AI optimization cards. Use the request panel on the left to ask for new targeting edits, or run a diagnostic batch audit.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
