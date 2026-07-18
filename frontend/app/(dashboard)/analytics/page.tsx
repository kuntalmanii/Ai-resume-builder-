"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Award, Briefcase, CheckCircle, BarChart3, AlertCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { analyticsAPI } from "@/lib/api";
import { toast } from "sonner";

// Exact TypeScript interfaces matching the backend DTO structures
interface FunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
}

interface ResumePerformanceMetric {
  resume_id: string;
  title: string;
  average_ats_score: number;
  average_jd_match: number;
  application_count: number;
}

interface SkillGapMetric {
  skill: string;
  frequency_in_jds: number;
  has_skill: boolean;
}

interface ApplicationsSummary {
  total: number;
  wishlist: number;
  applied: number;
  interviewing: number;
  offer: number;
  rejected: number;
  conversion_rate: number;
}

interface InterviewsSummary {
  total: number;
  average_score: number;
}

interface RoadmapsSummary {
  total: number;
  completed_steps: number;
  total_steps: number;
  completion_rate: number;
}

interface CredibilitySummary {
  score: number;
  audit_date?: string;
}

interface AnalyticsSummaryResponse {
  total_applications: number;
  interviews_scheduled: number;
  offers_received: number;
  rejections: number;
  interview_rate: number;
  offer_rate: number;
  funnel: FunnelStage[];
  resumes_performance: ResumePerformanceMetric[];
  skill_gaps: SkillGapMetric[];
  weekly_application_trends: Record<string, any>[];
  evidence_score_trend: Record<string, any>[];

  applications: ApplicationsSummary;
  interviews: InterviewsSummary;
  roadmaps: RoadmapsSummary;
  credibility: CredibilitySummary;
}

const DEFAULT_ANALYTICS: AnalyticsSummaryResponse = {
  total_applications: 0,
  interviews_scheduled: 0,
  offers_received: 0,
  rejections: 0,
  interview_rate: 0,
  offer_rate: 0,
  funnel: [],
  resumes_performance: [],
  skill_gaps: [],
  weekly_application_trends: [],
  evidence_score_trend: [],

  applications: {
    total: 0,
    wishlist: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    conversion_rate: 0,
  },
  interviews: {
    total: 0,
    average_score: 0,
  },
  roadmaps: {
    total: 0,
    completed_steps: 0,
    total_steps: 0,
    completion_rate: 0,
  },
  credibility: {
    score: 0,
    audit_date: undefined,
  },
};

// Validates API response fields at runtime and merges with default model to prevent crashes
function validateAndMergeAnalytics(apiData: unknown): AnalyticsSummaryResponse {
  if (!apiData || typeof apiData !== "object") {
    console.warn("Invalid API analytics data received. Using default fallback analytics.");
    return DEFAULT_ANALYTICS;
  }

  const dataObj = apiData as Record<string, unknown>;

  const getNested = <T extends object>(key: string, defaults: T): T => {
    const val = dataObj[key];
    if (!val || typeof val !== "object") {
      console.warn(`Analytics property "${key}" is missing or invalid. Merging with defaults.`);
      return defaults;
    }
    return { ...defaults, ...val };
  };

  return {
    total_applications: typeof dataObj.total_applications === "number" ? dataObj.total_applications : DEFAULT_ANALYTICS.total_applications,
    interviews_scheduled: typeof dataObj.interviews_scheduled === "number" ? dataObj.interviews_scheduled : DEFAULT_ANALYTICS.interviews_scheduled,
    offers_received: typeof dataObj.offers_received === "number" ? dataObj.offers_received : DEFAULT_ANALYTICS.offers_received,
    rejections: typeof dataObj.rejections === "number" ? dataObj.rejections : DEFAULT_ANALYTICS.rejections,
    interview_rate: typeof dataObj.interview_rate === "number" ? dataObj.interview_rate : DEFAULT_ANALYTICS.interview_rate,
    offer_rate: typeof dataObj.offer_rate === "number" ? dataObj.offer_rate : DEFAULT_ANALYTICS.offer_rate,
    funnel: Array.isArray(dataObj.funnel) ? (dataObj.funnel as FunnelStage[]) : DEFAULT_ANALYTICS.funnel,
    resumes_performance: Array.isArray(dataObj.resumes_performance) ? (dataObj.resumes_performance as ResumePerformanceMetric[]) : DEFAULT_ANALYTICS.resumes_performance,
    skill_gaps: Array.isArray(dataObj.skill_gaps) ? (dataObj.skill_gaps as SkillGapMetric[]) : DEFAULT_ANALYTICS.skill_gaps,
    weekly_application_trends: Array.isArray(dataObj.weekly_application_trends) ? (dataObj.weekly_application_trends as Record<string, unknown>[]) : DEFAULT_ANALYTICS.weekly_application_trends,
    evidence_score_trend: Array.isArray(dataObj.evidence_score_trend) ? (dataObj.evidence_score_trend as Record<string, unknown>[]) : DEFAULT_ANALYTICS.evidence_score_trend,

    applications: getNested("applications", DEFAULT_ANALYTICS.applications),
    interviews: getNested("interviews", DEFAULT_ANALYTICS.interviews),
    roadmaps: getNested("roadmaps", DEFAULT_ANALYTICS.roadmaps),
    credibility: getNested("credibility", DEFAULT_ANALYTICS.credibility),
  };
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse>(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsAPI.getSummary();
      const validatedData = validateAndMergeAnalytics(data);
      setSummary(validatedData);
    } catch (err) {
      console.error("Failed to load career analytics:", err);
      toast.error("Failed to load career analytics.");
      setError("Failed to fetch analytics from server.");
      setSummary(DEFAULT_ANALYTICS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        {/* Top cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-16 bg-muted rounded-md animate-pulse" />
                  <div className="h-6 w-12 bg-muted rounded-md animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom charts/pipeline skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border lg:col-span-2">
            <CardHeader className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded-md animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-24 bg-muted rounded-md animate-pulse" />
                    <div className="h-3 w-8 bg-muted rounded-md animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-muted rounded-md animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="space-y-2">
              <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 w-full mt-4">
                <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasNoData = summary.applications.total === 0 && summary.roadmaps.total === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            Career Search Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual reports covering interview conversions, credibility metrics, and skill-ups.
          </p>
        </div>
      </div>

      {error ? (
        <div className="h-64 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
          <AlertCircle className="w-12 h-12 text-rose-500/80 mb-3" />
          <h3 className="font-bold text-foreground text-lg">Server Connection Offline</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            We are having trouble contacting the analytics server. Retrying connection shortly...
          </p>
        </div>
      ) : hasNoData ? (
        <div className="h-64 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-slate-50 dark:bg-slate-900/50">
          <AlertCircle className="w-12 h-12 text-slate-400 mb-3" />
          <h3 className="font-bold text-foreground text-lg">No analytics available yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Start applying to jobs or building upskilling roadmaps to populate your career analytics dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Applications</span>
                  <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{summary.applications.total}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Offers Won</span>
                  <h3 className="text-2xl font-extrabold text-emerald-500 mt-0.5">{summary.applications.offer}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Interview Conversion</span>
                  <h3 className="text-2xl font-extrabold text-indigo-500 mt-0.5">
                    {summary.applications.conversion_rate.toFixed(0)}%
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Credibility Score</span>
                  <h3 className="text-2xl font-extrabold text-amber-500 mt-0.5">{summary.credibility.score}/100</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grids for details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Funnel */}
            <Card className="border border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" /> Pipeline Funnel Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Applied (Active Hunt)</span>
                      <span>{summary.applications.applied}</span>
                    </div>
                    <Progress value={summary.applications.total > 0 ? (summary.applications.applied / summary.applications.total) * 100 : 0} className="h-2 bg-muted/60" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Interviews Scheduled</span>
                      <span>{summary.applications.interviewing}</span>
                    </div>
                    <Progress value={summary.applications.total > 0 ? (summary.applications.interviewing / summary.applications.total) * 100 : 0} className="h-2 bg-indigo-200" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Offers Extended</span>
                      <span>{summary.applications.offer}</span>
                    </div>
                    <Progress value={summary.applications.total > 0 ? (summary.applications.offer / summary.applications.total) * 100 : 0} className="h-2 bg-emerald-200" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Rejected / Archived</span>
                      <span>{summary.applications.rejected}</span>
                    </div>
                    <Progress value={summary.applications.total > 0 ? (summary.applications.rejected / summary.applications.total) * 100 : 0} className="h-2 bg-rose-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upskilling stats */}
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-lg">Upskilling Tracker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center p-6 border border-border bg-muted/20 rounded-xl">
                  <div className="text-4xl font-extrabold text-violet-600">
                    {summary.roadmaps.completion_rate.toFixed(0)}%
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Steps Mastery</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Total Roadmaps:</span>
                    <span className="font-bold text-foreground">{summary.roadmaps.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Completed Steps:</span>
                    <span className="font-bold text-foreground">
                      {summary.roadmaps.completed_steps} / {summary.roadmaps.total_steps}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
