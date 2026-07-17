"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AtsScoreRing, CategoryScoreBar } from "@/components/ui/ats-score";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link as LinkIcon,
  HelpCircle,
  Activity,
  Award,
  Briefcase,
  Calendar,
  Layers,
  GraduationCap
} from "lucide-react";
import { resumesAPI, evidenceAPI, careerEntriesAPI, CareerEntry } from "@/lib/api";
import type { Resume, EvidenceAudit, EvidenceMethodology, ResumeClaim } from "@/types";

export default function ResumeEvidencePage({ params }: { params: { id: string } }) {
  const resumeId = params.id;

  // Domain states
  const [resume, setResume] = useState<Resume | null>(null);
  const [latestAudit, setLatestAudit] = useState<EvidenceAudit | null>(null);
  const [claims, setClaims] = useState<ResumeClaim[]>([]);
  const [auditsList, setAuditsList] = useState<EvidenceAudit[]>([]);
  const [methodology, setMethodology] = useState<EvidenceMethodology | null>(null);
  const [careerEntries, setCareerEntries] = useState<CareerEntry[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "explorer" | "methodology">("dashboard");
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  // Explorer Filter states
  const [searchText, setSearchText] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");

  // Interaction pending states
  const [confirmingClaims, setConfirmingClaims] = useState<Record<string, boolean>>({});
  const [linkingClaims, setLinkingClaims] = useState<Record<string, string>>({}); // claimId -> selectedCareerEntryId
  const [submittingLink, setSubmittingLink] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async (forceAuditListUpdate = true) => {
    try {
      const [resumeRes, latestAuditRes, claimsRes, methodologyRes, careerEntriesRes] = await Promise.all([
        resumesAPI.get(resumeId),
        evidenceAPI.getLatestAudit(resumeId).catch(() => null),
        evidenceAPI.listClaims(resumeId).catch(() => []),
        evidenceAPI.getMethodology().catch(() => null),
        careerEntriesAPI.list().catch(() => []),
      ]);

      setResume(resumeRes);
      setLatestAudit(latestAuditRes);
      setClaims(claimsRes);
      setMethodology(methodologyRes);
      setCareerEntries(careerEntriesRes);

      if (forceAuditListUpdate) {
        const historyRes = await evidenceAPI.listAudits(resumeId).catch(() => []);
        setAuditsList(historyRes);
      }
    } catch (error) {
      toast.error("Failed to load credibility audit data.");
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAudit = async (force = false) => {
    setIsAuditing(true);
    toast.info(force ? "Running fresh credibility audit..." : "Analyzing resume consistency...");
    try {
      const newAudit = await evidenceAPI.runAudit(resumeId, force);
      setLatestAudit(newAudit);
      toast.success("Credibility audit completed!");
      await fetchData(true);
    } catch (error: any) {
      toast.error("Credibility audit failed to run.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleConfirmClaim = async (claimId: string) => {
    setConfirmingClaims((prev) => ({ ...prev, [claimId]: true }));
    try {
      await evidenceAPI.confirmClaim(resumeId, claimId);
      toast.success("Factual claim successfully confirmed!");
      await fetchData(false);
    } catch (error) {
      toast.error("Failed to confirm claim.");
    } finally {
      setConfirmingClaims((prev) => ({ ...prev, [claimId]: false }));
    }
  };

  const handleLinkCareerEntry = async (claimId: string) => {
    const entryId = linkingClaims[claimId];
    if (!entryId) {
      toast.error("Please select a career entry to link.");
      return;
    }
    setSubmittingLink((prev) => ({ ...prev, [claimId]: true }));
    try {
      await evidenceAPI.linkCareerEntry(resumeId, claimId, entryId);
      toast.success("Factual claim successfully linked to Career Profile entry!");
      setLinkingClaims((prev) => ({ ...prev, [claimId]: "" }));
      await fetchData(false);
    } catch (error) {
      toast.error("Failed to link career entry.");
    } finally {
      setSubmittingLink((prev) => ({ ...prev, [claimId]: false }));
    }
  };

  // Memoized filter logic for Explorer
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch = claim.claim_text.toLowerCase().includes(searchText.toLowerCase()) || 
        (claim.normalized_value && claim.normalized_value.toLowerCase().includes(searchText.toLowerCase()));
      const matchesSection = filterSection === "all" || claim.source_section === filterSection;
      const matchesType = filterType === "all" || claim.claim_type === filterType;
      const matchesStatus = filterStatus === "all" || claim.verification_status === filterStatus;
      
      let matchesRisk = true;
      if (filterRisk !== "all") {
        const riskMap: Record<string, string> = {
          employer: "high", job_title: "high", degree: "high", certification: "high", dates: "high",
          metric: "medium", skills: "low", technology: "low", responsibility: "low"
        };
        const risk = riskMap[claim.claim_type] || "low";
        matchesRisk = risk === filterRisk;
      }

      return matchesSearch && matchesSection && matchesType && matchesStatus && matchesRisk;
    });
  }, [claims, searchText, filterSection, filterType, filterStatus, filterRisk]);

  const riskBadge = (type: string) => {
    const riskMap: Record<string, { label: string; class: string }> = {
      employer: { label: "High Risk", class: "bg-orange-500/10 text-orange-600 border-0 text-[10px]" },
      job_title: { label: "High Risk", class: "bg-orange-500/10 text-orange-600 border-0 text-[10px]" },
      degree: { label: "High Risk", class: "bg-orange-500/10 text-orange-600 border-0 text-[10px]" },
      certification: { label: "High Risk", class: "bg-orange-500/10 text-orange-600 border-0 text-[10px]" },
      dates: { label: "High Risk", class: "bg-orange-500/10 text-orange-600 border-0 text-[10px]" },
      metric: { label: "Medium Risk", class: "bg-amber-500/10 text-amber-600 border-0 text-[10px]" },
    };
    const risk = riskMap[type] || { label: "Low Risk", class: "bg-emerald-500/10 text-emerald-600 border-0 text-[10px]" };
    return <Badge className={risk.class}>{risk.label}</Badge>;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "source_verified":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 flex items-center gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" /> Factual (Source)</Badge>;
      case "career_profile_supported":
        return <Badge className="bg-cyan-500/10 text-cyan-600 border-0 flex items-center gap-1 text-[10px]"><Shield className="w-3 h-3" /> Profile Confirmed</Badge>;
      case "user_confirmed":
        return <Badge className="bg-blue-500/10 text-blue-600 border-0 flex items-center gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" /> User Confirmed</Badge>;
      case "inferred":
        return <Badge className="bg-amber-500/10 text-amber-600 border-0 flex items-center gap-1 text-[10px]"><Info className="w-3 h-3" /> Partially Verified</Badge>;
      case "contradictory":
        return <Badge className="bg-rose-500/10 text-rose-600 border-0 flex items-center gap-1 text-[10px]"><XCircle className="w-3 h-3" /> Contradictory</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-600 border-0 text-[10px]">Unverified</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading credibility audit dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Evidence Mode & Credibility Dashboard"
        description="Run deterministic consistency audits to identify contradictions, verify factual metrics, and match against your official career log."
        backLink={`/resumes/${resumeId}/edit`}
        action={
          <Button
            onClick={() => handleRunAudit(true)}
            disabled={isAuditing}
            className="flex items-center gap-2"
          >
            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Credibility Audit
          </Button>
        }
      />

      {/* Tabs Menu */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
            activeTab === "dashboard" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview & Scores
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
            activeTab === "explorer" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Claims Explorer ({filteredClaims.length})
        </button>
        <button
          onClick={() => setActiveTab("methodology")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
            activeTab === "methodology" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Methodology & Help
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW & SCORES */}
        {activeTab === "dashboard" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left side: Main score circle + dimension bars */}
            <div className="lg:col-span-8 space-y-6">
              {!latestAudit ? (
                <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-4 bg-card">
                  <Shield className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-bold text-lg">No Credibility Audit Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                      This resume version has not been audited yet. Run a consistency check to analyze metrics, timelines, and facts.
                    </p>
                  </div>
                  <Button onClick={() => handleRunAudit(false)} disabled={isAuditing} className="flex items-center gap-2">
                    {isAuditing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Initialize First Audit
                  </Button>
                </Card>
              ) : (
                <>
                  <Card className="p-6 bg-card">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-4 flex justify-center">
                        <AtsScoreRing score={latestAudit.overall_score} size="lg" />
                      </div>
                      <div className="md:col-span-8 space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-foreground">Credibility Indicator</h3>
                            <Badge className="bg-primary/10 text-primary border-0">Version {latestAudit.resume_version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {latestAudit.summary || "This score aggregates timeline continuity, factual grounding, and metrics consistency checking."}
                          </p>
                        </div>
                        {latestAudit.ai_fallback_active && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs rounded-md p-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              <strong>AI Fallback Active:</strong> A Gemini API limit occurred; scoring is running on local deterministic logic.
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4 text-center border-t border-border pt-4">
                          <div>
                            <div className="text-2xl font-bold text-foreground">{claims.length}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Claims Checked</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-emerald-600">
                              {claims.filter((c) => c.verification_status in ["source_verified", "career_profile_supported", "user_confirmed"]).length}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Verified</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-rose-600">{latestAudit.contradiction_count}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Contradictions</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* 5 Dimensions Grid */}
                  <Card className="p-6 space-y-6 bg-card">
                    <h3 className="font-bold text-base text-foreground">Credibility Scoring Breakdown</h3>
                    <div className="space-y-4">
                      <CategoryScoreBar label="Factual Grounding (Profile & Evidence Match)" score={latestAudit.profile_grounding_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Checks if claims (employers, roles, degrees) are corroborated by your verified Career Profile.</span>
                      </div>

                      <CategoryScoreBar label="Timeline Consistency (Dates Continuity)" score={latestAudit.timeline_consistency_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Flags overlapping dates for full-time jobs, start/end date mismatches, or impossible achievements.</span>
                      </div>

                      <CategoryScoreBar label="Experience Continuity (Employability Gaps)" score={latestAudit.experience_continuity_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Checks for gaps of more than 6 months between jobs that lack a reasonable explanation.</span>
                      </div>

                      <CategoryScoreBar label="Metrics Believability (Data Plausibility)" score={latestAudit.metrics_believability_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Verifies that numeric percentages, financial values, and scales are plausible and not exaggerated.</span>
                      </div>

                      <CategoryScoreBar label="Structural Integrity (Deductions Penalties)" score={latestAudit.integrity_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Enforces penalization constraints for contradictory claims or unsupported high-risk elements.</span>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>

            {/* Right side: Audit History Log */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-5 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Audit History</h3>
                </div>
                {auditsList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No historical audit records found.</div>
                ) : (
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {auditsList.map((aud) => (
                      <div key={aud.id} className="p-3 border rounded-lg bg-card/60 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground">Score: {aud.overall_score}/100</div>
                          <div className="text-xs text-muted-foreground truncate">
                            Resume v{aud.resume_version} &bull; {new Date(aud.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className={aud.contradiction_count > 0 ? "text-rose-600 border-rose-500/20" : "text-emerald-600 border-emerald-500/20 text-[10px]"}>
                          {aud.contradiction_count} errors
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {/* TAB 2: CLAIMS EXPLORER */}
        {activeTab === "explorer" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Filter Bar */}
            <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center bg-card">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search claim text..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9 w-full bg-transparent border border-input rounded-md py-1.5 text-sm outline-none focus:border-ring"
                />
              </div>

              <div>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full bg-card border border-input rounded-md py-1.5 text-xs outline-none px-2"
                >
                  <option value="all">All Sections</option>
                  <option value="experience">Experience</option>
                  <option value="education">Education</option>
                  <option value="projects">Projects</option>
                  <option value="skills">Skills</option>
                </select>
              </div>

              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-card border border-input rounded-md py-1.5 text-xs outline-none px-2"
                >
                  <option value="all">All Types</option>
                  <option value="employer">Employer</option>
                  <option value="job_title">Job Title</option>
                  <option value="dates">Dates</option>
                  <option value="metric">Metric</option>
                  <option value="degree">Degree</option>
                  <option value="certification">Certification</option>
                  <option value="responsibility">Responsibility</option>
                  <option value="skills">Skill</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-card border border-input rounded-md py-1.5 text-xs outline-none px-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="source_verified">Source Verified</option>
                  <option value="career_profile_supported">Profile Supported</option>
                  <option value="user_confirmed">User Confirmed</option>
                  <option value="inferred">Partially Verified (Inferred)</option>
                  <option value="contradictory">Contradictory</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
            </Card>

            {/* Claims List */}
            {filteredClaims.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 text-muted-foreground bg-card">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                No claims matched the filter query.
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredClaims.map((claim) => {
                  const isExpanded = expandedClaimId === claim.id;
                  return (
                    <Card key={claim.id} className={`border transition-all bg-card ${isExpanded ? "ring-1 ring-primary" : "hover:border-border-hover"}`}>
                      {/* Header Row */}
                      <div
                        onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-1 shrink-0">
                            {claim.verification_status === "contradictory" ? (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            ) : claim.verification_status in ["source_verified", "career_profile_supported", "user_confirmed"] ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground leading-tight">
                              {claim.claim_text}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span className="font-medium uppercase text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                {claim.source_section}
                              </span>
                              <span>&bull;</span>
                              <span className="capitalize">{claim.claim_type.replace("_", " ")}</span>
                              {claim.normalized_value && (
                                <>
                                  <span>&bull;</span>
                                  <span className="font-mono text-[10px] bg-muted/60 px-1 py-0.5 rounded text-foreground">
                                    Norm: {claim.normalized_value}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {statusBadge(claim.verification_status)}
                          {riskBadge(claim.claim_type)}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expandable Details & Actions */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
                              {claim.contradiction_details && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs rounded-md">
                                  <strong>Contradiction Detected:</strong> {claim.contradiction_details}
                                </div>
                              )}

                              {/* Evidence Sources List */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Factual Evidence Sources</h4>
                                {(!claim.evidence_sources || claim.evidence_sources.length === 0) ? (
                                  <div className="text-xs text-muted-foreground p-3 border rounded bg-muted/20">
                                    No corroborating sources linked. This claim is unverified.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {claim.evidence_sources.map((src) => (
                                      <div key={src.id} className="p-3 border rounded bg-card/40 space-y-2 text-xs">
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold text-foreground flex items-center gap-1">
                                            <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                            {src.label}
                                          </span>
                                          <Badge className="bg-primary-subtle text-primary border-0 text-[10px]">
                                            {(src.source_type || src.sourceType || "").replace("_", " ")}
                                          </Badge>
                                        </div>
                                        {src.excerpt && (
                                          <blockquote className="italic text-muted-foreground pl-2.5 border-l-2 border-border-hover/60">
                                            "{src.excerpt}"
                                          </blockquote>
                                        )}
                                        {src.evidence_strength && (
                                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                            <span>Strength:</span>
                                            <span className="font-semibold capitalize text-foreground">{src.evidence_strength}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Operations / Correction UX */}
                              {claim.verification_status !== "source_verified" && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border/80">
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-foreground">Verify this Claim</h4>
                                    <p className="text-[11px] text-muted-foreground">
                                      Confirm this claim is accurate or match it to a verified career log entry.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Link to Profile Entry Selection */}
                                    <div className="flex items-center gap-1">
                                      <select
                                        value={linkingClaims[claim.id] || ""}
                                        onChange={(e) => setLinkingClaims((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                                        className="bg-card border border-input rounded py-1 px-1.5 text-xs outline-none max-w-[180px]"
                                      >
                                        <option value="">Select Log Entry...</option>
                                        {careerEntries
                                          .filter((e) => {
                                            if (claim.source_section === "experience") return e.entry_type === "experience";
                                            if (claim.source_section === "education") return e.entry_type === "education";
                                            if (claim.source_section === "projects") return e.entry_type === "project";
                                            return true; // Match generic
                                          })
                                          .map((e) => (
                                            <option key={e.id} value={e.id}>
                                              {e.title} at {e.organization}
                                            </option>
                                          ))}
                                      </select>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleLinkCareerEntry(claim.id)}
                                        disabled={submittingLink[claim.id]}
                                        className="h-7 text-xs flex items-center gap-1"
                                      >
                                        {submittingLink[claim.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                                        Link
                                      </Button>
                                    </div>

                                    <Button
                                      size="sm"
                                      onClick={() => handleConfirmClaim(claim.id)}
                                      disabled={confirmingClaims[claim.id]}
                                      className="h-7 text-xs flex items-center gap-1"
                                    >
                                      {confirmingClaims[claim.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                      Confirm Factual
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: METHODOLOGY */}
        {activeTab === "methodology" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {!methodology ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Methodology details could not be retrieved from the server.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4 bg-card">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-base text-foreground">Scoring Weights & Dimensions</h3>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {Object.entries(methodology.dimensions).map(([key, dim]: [string, any]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-foreground">{dim.name}</span>
                          <span className="text-primary">{dim.weight * 100}% Weight</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{dim.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 space-y-4 bg-card">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-base text-foreground">Severity Level Penalties</h3>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    {Object.entries(methodology.severity_levels).map(([level, info]: [string, any]) => (
                      <div key={level} className="flex justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold capitalize text-foreground">{level} Severity</span>
                          <p className="text-[11px] text-muted-foreground">{info.description}</p>
                        </div>
                        <Badge className="bg-rose-500/10 text-rose-600 border-0 shrink-0 h-6 text-[10px]">-{info.deduction} pts</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 md:col-span-2 space-y-4 bg-card">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-cyan-500" />
                    <h3 className="font-bold text-base text-foreground">Trust State Multipliers</h3>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Evidence strength and trust states multiply the validation base values. Higher-quality verification boosts your score.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {Object.entries(methodology.trust_multipliers).map(([state, mult]: [string, any]) => (
                      <div key={state} className="p-3 border rounded-lg text-center bg-muted/20">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                          {state.replace("_", " ")}
                        </div>
                        <div className="text-xl font-bold text-foreground mt-1">x{mult}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
