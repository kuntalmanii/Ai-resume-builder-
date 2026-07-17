"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Award, Briefcase, CheckCircle, BarChart3, AlertCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyticsAPI } from "@/lib/api";
import { toast } from "sonner";

interface AnalyticsSummary {
  applications: {
    total: number;
    wishlist: number;
    applied: number;
    interviewing: number;
    offer: number;
    rejected: number;
    conversion_rate: number;
  };
  interviews: {
    total: number;
    average_score: number;
  };
  roadmaps: {
    total: number;
    completed_steps: number;
    total_steps: number;
    completion_rate: number;
  };
  credibility: {
    score: number;
    audit_date?: string;
  };
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getSummary();
      setSummary(data);
    } catch (err) {
      toast.error("Failed to load career analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : summary ? (
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
      ) : (
        <div className="h-64 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground/60 mb-3" />
          <h3 className="font-bold text-foreground text-lg">No analytics data</h3>
        </div>
      )}
    </div>
  );
}
