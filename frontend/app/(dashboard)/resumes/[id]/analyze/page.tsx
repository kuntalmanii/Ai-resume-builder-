/**
 * Resume ATS Analysis Page — Phase 9.
 * Replaces mock data with real backend scoring engine integration.
 *
 * States:
 *   no-analysis  → Show CTA to run first analysis
 *   running      → Running spinner (POST in flight)
 *   completed    → Full scorecard (fresh)
 *   stale        → Scorecard + stale warning banner
 *   failed       → Error toast + retry
 *   empty-resume → Warn user to add content before analyzing
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AtsScoreRing, CategoryScoreBar } from "@/components/ui/ats-score";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { toast } from "sonner";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  Zap,
  BookOpen,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analysesAPI, resumesAPI } from "@/lib/api";
import type {
  ResumeAnalysisResponse,
  ResumeAnalysisCheckResponse,
  CategoryBreakdown,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  ats: {
    label: "ATS Compatibility",
    description: "Structural properties that affect Applicant Tracking System parseability",
  },
  content: {
    label: "Content Strength",
    description: "Quality of bullet points: action verbs, specificity, and measurable impact",
  },
  completeness: {
    label: "Completeness",
    description: "How complete the resume is across required and optional sections",
  },
  readability: {
    label: "Readability",
    description: "How easy the resume is to scan — bullet length, complexity, and balance",
  },
  grammar: {
    label: "Grammar",
    description: "Deterministic grammar checks for common formatting issues",
  },
  evidence: {
    label: "Evidence & Credibility",
    description: "Internal consistency, timeline validity, and Career Profile alignment",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckRow({ check }: { check: ResumeAnalysisCheckResponse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden transition-all duration-200",
        check.status === "passed" && "border-emerald-500/20 bg-emerald-500/5",
        check.status === "warning" && "border-amber-500/20 bg-amber-500/5",
        check.status === "failed" && "border-destructive/20 bg-destructive/5"
      )}
    >
      <button
        id={`check-${check.check_code}`}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {check.status === "passed" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {check.status === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
          {check.status === "failed" && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground truncate block">{check.title}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{check.check_code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className={cn(
              "text-xs font-bold",
              check.status === "passed" ? "text-emerald-500" :
              check.status === "warning" ? "text-amber-500" : "text-destructive"
            )}>
              {check.points_awarded}
            </span>
            <span className="text-[10px] text-muted-foreground">/{check.points_possible} pts</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5 border-t border-border/40">
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-2.5">
                {check.description}
              </p>
              {check.recommendation && (
                <div className="bg-muted/50 rounded p-2.5 border-l-2 border-l-primary">
                  <p className="text-[11px] text-foreground font-medium leading-relaxed">
                    <span className="text-primary font-bold">Recommendation: </span>
                    {check.recommendation}
                  </p>
                </div>
              )}
              {check.points_lost > 0 && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  Points lost: <span className="text-destructive font-bold">{check.points_lost}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryPanel({
  category,
  checks,
}: {
  category: CategoryBreakdown;
  checks: ResumeAnalysisCheckResponse[];
}) {
  const meta = CATEGORY_META[category.category] || { label: category.category, description: "" };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="p-5 border-b border-border/50 bg-muted/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">{meta.label} Report</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-bold text-foreground">{category.normalized}</span>
            <span className="text-xs text-muted-foreground font-semibold">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 border border-border/60 rounded-lg p-3 bg-muted/5">
          <div className="text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Passed</span>
            <span className="text-sm font-bold text-emerald-500">{category.passed_count} checks</span>
          </div>
          <div className="text-center border-x border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Warnings</span>
            <span className="text-sm font-bold text-amber-500">{category.warning_count} alerts</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Failed</span>
            <span className="text-sm font-bold text-destructive">{category.failed_count} errors</span>
          </div>
        </div>

        {/* Check list */}
        <div className="space-y-2">
          {checks.map((check) => (
            <CheckRow key={check.check_code} check={check} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StaleWarningBanner({ onReAnalyze, isRunning }: { onReAnalyze: () => void; isRunning: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
        <span className="font-bold">Analysis is outdated.</span> Your resume has been edited since this
        analysis was run. Re-analyze to get an updated score.
      </p>
      <Button
        id="re-analyze-stale-btn"
        variant="outline"
        size="sm"
        className="h-7 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
        onClick={onReAnalyze}
        disabled={isRunning}
      >
        {isRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
        Re-analyze
      </Button>
    </div>
  );
}

function MethodologyInfo({ version }: { version: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        id="methodology-toggle"
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Scoring Methodology</span>
          <span className="font-mono text-[10px] border border-border rounded px-1">{version}</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-border/40 space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scoring is <strong>100% deterministic</strong> — no LLM-generated scores. Each check
                uses rule-based pattern matching against your resume content. The raw score (0–75) is
                normalized to a 0–100 scale. JD Match (+25 pts) will be added in a future phase.
              </p>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                {Object.entries(CATEGORY_META).map(([key, { label }]) => (
                  <span key={key} className="text-[10px]">• {label}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResumeAnalyzePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: resumeId } = use(params);

  const [analysis, setAnalysis] = useState<ResumeAnalysisResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ats");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [hasNoAnalysis, setHasNoAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysesAPI.getLatest(resumeId);
      setAnalysis(data);
      setHasNoAnalysis(false);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 404) {
        setHasNoAnalysis(true);
        setAnalysis(null);
      } else {
        setError("Failed to load analysis. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const runAnalysis = async (force = false) => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await analysesAPI.run(resumeId, force);
      setAnalysis(result.analysis);
      setHasNoAnalysis(false);
      if (result.from_cache) {
        toast.info("Returned cached analysis for this resume version.");
      } else {
        toast.success("Analysis complete!");
      }
    } catch {
      setError("Analysis failed. Please try again.");
      toast.error("Failed to run analysis.");
    } finally {
      setIsRunning(false);
    }
  };

  // Group checks by category
  const checksByCategory = analysis
    ? analysis.checks.reduce<Record<string, ResumeAnalysisCheckResponse[]>>((acc, c) => {
        if (!acc[c.category]) acc[c.category] = [];
        acc[c.category].push(c);
        return acc;
      }, {})
    : {};

  const activeCategoryData = analysis?.categories.find((c) => c.category === activeCategory);
  const activeCategoryChecks = checksByCategory[activeCategory] || [];

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="ATS Score Analysis"
          description="Comprehensive scorecard with deterministic ATS checks and recommendations."
          backLink={`/resumes`}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Analysis State ──────────────────────────────────────────────────────
  if (hasNoAnalysis) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          title="ATS Score Analysis"
          description="Comprehensive scorecard with deterministic ATS checks and recommendations."
          backLink={`/resumes`}
        />
        <div className="flex flex-col items-center justify-center h-72 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No Analysis Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Run your first analysis to get a detailed ATS scorecard with actionable recommendations.
            </p>
          </div>
          <Button
            id="run-first-analysis-btn"
            className="h-9 px-6 bg-primary text-primary-foreground text-xs font-bold"
            onClick={() => runAnalysis(false)}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error && !analysis) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="ATS Score Analysis" description="" backLink={`/resumes`} />
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
          <XCircle className="w-10 h-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => fetchLatest()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // ─── Full Analysis View ─────────────────────────────────────────────────────
  const scoreLabel =
    analysis.overall_score >= 85 ? "Excellent" :
    analysis.overall_score >= 70 ? "Good" :
    analysis.overall_score >= 50 ? "Average" : "Needs Work";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="ATS Score Analysis"
        description={`Deterministic scorecard · ${analysis.analysis_version} · ${analysis.checks.length} checks run`}
        backLink={`/resumes`}
        action={
          <Button
            id="re-analyze-btn"
            onClick={() => runAnalysis(true)}
            variant="outline"
            size="sm"
            className="h-9 border-border text-xs font-semibold gap-1.5 bg-card"
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Re-analyze</span>
          </Button>
        }
      />

      {/* Stale warning */}
      {analysis.is_stale && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <StaleWarningBanner onReAnalyze={() => runAnalysis(true)} isRunning={isRunning} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left Column: Score + Categories ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Score ring */}
          <Card className="border border-border shadow-sm bg-card p-5 flex flex-col items-center text-center">
            <AtsScoreRing score={analysis.overall_score} size="lg" />
            <div className="mt-4 space-y-1 w-full">
              {analysis.potential_score_gain > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-primary font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{analysis.potential_score_gain} pts potential</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Raw: {analysis.raw_score}/{analysis.raw_max_score} · {scoreLabel}
              </p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-1">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(analysis.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </Card>

          {/* Category tabs */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Score Breakdown
            </h4>
            {analysis.categories.map((cat) => {
              const meta = CATEGORY_META[cat.category] || { label: cat.category };
              return (
                <button
                  key={cat.category}
                  id={`cat-tab-${cat.category}`}
                  onClick={() => setActiveCategory(cat.category)}
                  className={cn(
                    "w-full text-left p-3 border rounded-lg transition-all",
                    activeCategory === cat.category
                      ? "bg-primary/8 border-primary/20 shadow-xs"
                      : "border-border hover:bg-muted/30 bg-card"
                  )}
                >
                  <CategoryScoreBar label={meta.label} score={cat.normalized} />
                </button>
              );
            })}
          </div>

          {/* Methodology toggle */}
          <MethodologyInfo version={analysis.analysis_version} />
        </div>

        {/* ── Right Column: Category Detail ── */}
        <div className="lg:col-span-2">
          {activeCategoryData ? (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <CategoryPanel
                category={activeCategoryData}
                checks={activeCategoryChecks}
              />
            </motion.div>
          ) : null}

          {/* Top Recommendations */}
          {analysis.top_recommendations.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Top Recommendations (Sorted by Impact)
              </h4>
              <div className="space-y-2">
                {analysis.top_recommendations.slice(0, 5).map((rec) => (
                  <div
                    key={rec.check_code}
                    id={`rec-${rec.check_code}`}
                    className="flex items-start gap-3 p-3.5 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className={cn(
                      "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                      rec.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                    )}>
                      -{rec.points_lost}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{rec.title}</span>
                        <SeverityBadge status={rec.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {rec.recommendation}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono capitalize">
                        {rec.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JD Match placeholder */}
          {analysis.jd_match_score === null && (
            <div className="mt-4 flex items-center gap-3 p-3.5 border border-border/60 rounded-lg bg-muted/10">
              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Job Description Matching — Coming Soon</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Upload a job description to enable keyword matching and JD alignment scoring (+25 pts).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
