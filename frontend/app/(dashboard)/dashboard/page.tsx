/**
 * Dashboard home — stats overview and quick actions.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  PlusCircle,
  Upload,
  BarChart3,
  ArrowRight,
  Target,
  Sparkles,
  User,
  TrendingUp,
  Clock,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AtsScoreRing } from "@/components/ui/ats-score";
import { resumesAPI } from "@/lib/api";
import type { Resume } from "@/types";
import { toast } from "sonner";

const quickActions = [
  {
    id: "create-resume",
    label: "Create Resume",
    description: "Build a new resume from scratch",
    href: "/resumes/new",
    icon: PlusCircle,
    gradient: "bg-primary text-primary-foreground hover:bg-primary/95",
    primary: true,
  },
  {
    id: "upload-resume",
    label: "Upload Resume",
    description: "Import your existing PDF or DOCX",
    href: "/upload",
    icon: Upload,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
  {
    id: "analyze-resume",
    label: "Analyze Resume",
    description: "Get ATS score and AI suggestions",
    href: "/upload",
    icon: BarChart3,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
  {
    id: "match-jd",
    label: "Match Job Description",
    description: "Compare resume against a job posting",
    href: "/resumes",
    icon: Target,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
];

const aiTips = [
  "Action verbs like 'Spearheaded' or 'Formulated' score 25% higher on ATS screeners than generic verbs like 'Led' or 'Managed'.",
  "Ensure your key technical skills are formatted as comma-separated values inside a clean 'Skills' section for optimal parser indexing.",
  "Quantifying results (e.g. 'boosted efficiency by 18%') provides the highest weight in resume score evaluations.",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return `Edited ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return "Recently edited";
  }
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");
  const [tipIndex, setTipIndex] = useState(0);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await resumesAPI.list();
      setResumes(data);
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();

    const hours = new Date().getHours();
    if (hours >= 12 && hours < 17) {
      setGreeting("Good afternoon");
    } else if (hours >= 17 || hours < 4) {
      setGreeting("Good evening");
    } else {
      setGreeting("Good morning");
    }

    // Rotate tips
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % aiTips.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const firstName = mounted && user?.full_name?.split(" ")[0] ? user.full_name.split(" ")[0] : "there";

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Dynamic Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here is your career search progress today.
          </p>
        </div>

        {/* Profile completion metric */}
        <div className="bg-card border border-border rounded-lg p-3 w-full md:w-64 space-y-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-muted-foreground uppercase">Profile Completeness</span>
            <span className="text-primary">70%</span>
          </div>
          <Progress value={70} className="h-1.5 bg-muted" />
        </div>
      </motion.div>

      {/* Rotating AI Tip Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex gap-3 items-start text-primary"
      >
        <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider">AI Optimizer Tip</h4>
          <p className="text-xs text-foreground/80 leading-relaxed transition-all duration-300">
            {aiTips[tipIndex]}
          </p>
        </div>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {quickActions.map((action) => (
          <motion.div key={action.id} variants={itemVariants}>
            <Link href={action.href}>
              <div
                className={cn(
                  "group relative p-5 rounded-lg border flex flex-col justify-between h-full transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                  action.primary
                    ? "bg-primary border-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/30"
                )}
              >
                <div>
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center mb-4 shadow-sm",
                      action.primary ? "bg-white/10 text-white" : "bg-[#F1F3F6] text-primary"
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                  </div>
                  <h3 className={cn("font-bold text-sm", action.primary ? "text-white" : "text-foreground")}>
                    {action.label}
                  </h3>
                  <p className={cn("text-xs mt-1 leading-normal", action.primary ? "text-white/80" : "text-muted-foreground")}>
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Primary Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Spotlight & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resume Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {resumes.length === 0 ? (
              <Card className="bg-card border-border text-foreground shadow-sm">
                <CardContent className="p-8 text-center space-y-3">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <h3 className="font-bold text-sm">No resumes built yet</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Build your first resume to start optimizing your ATS score with AI suggestions.
                  </p>
                  <div className="pt-2">
                    <Link href="/resumes/new">
                      <Button size="sm" className="h-8 text-xs font-semibold">
                        Create Resume
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              (() => {
                const resumesWithScore = resumes.filter((r) => r.latest_score !== undefined && r.latest_score !== null);
                const spotlightResume = resumesWithScore.length > 0 
                  ? [...resumesWithScore].sort((a, b) => (b.latest_score ?? 0) - (a.latest_score ?? 0))[0]
                  : resumes[0];
                const hasScore = spotlightResume.latest_score !== undefined && spotlightResume.latest_score !== null;

                return (
                  <Card className="bg-card border-border text-foreground shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Resume Spotlight
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6 justify-between">
                      <div className="space-y-2 text-center sm:text-left">
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-bold px-2 py-0.5 text-[9px] uppercase">
                          {hasScore ? "Highest ATS Score" : "Active Resume"}
                        </Badge>
                        <h3 className="font-bold text-base text-foreground">{spotlightResume.title}</h3>
                        <p className="text-xs text-muted-foreground leading-normal max-w-sm">
                          {hasScore
                            ? "This resume is currently optimized with strong qualification metrics and high keyword density."
                            : "This resume hasn't been analyzed yet. Run an ATS check to identify optimization opportunities."}
                        </p>
                        <div className="pt-2">
                          <Link href={`/resumes/${spotlightResume.id}/edit`}>
                            <Button size="sm" className="h-8 text-xs font-semibold px-4">
                              {hasScore ? "Improve Further" : "Edit Resume"}
                              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-col items-center bg-[#F1F3F6]/50 border border-border/30 p-4 rounded-xl shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">ATS Score</span>
                        {hasScore ? (
                          <AtsScoreRing score={spotlightResume.latest_score ?? 0} size="sm" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground py-4">Not analyzed yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            )}
          </motion.div>

          {/* Recent Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card border-border text-foreground shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {resumes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No recent activity.</p>
                ) : (
                  resumes.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-start gap-4">
                      <div className="w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 text-emerald-500 bg-emerald-500/10">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          Updated resume "{r.title}" (v{r.version})
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDate(r.updated_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Key Metrics / Stats */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            {(() => {
              const resumesWithScore = resumes.filter((r) => r.latest_score !== undefined && r.latest_score !== null);
              const avgScore = resumesWithScore.length > 0
                ? Math.round(resumesWithScore.reduce((sum, r) => sum + (r.latest_score ?? 0), 0) / resumesWithScore.length)
                : null;

              return (
                <Card className="bg-card border-border text-foreground shadow-sm h-full flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Your Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 flex-1 flex flex-col justify-around gap-6">
                    {[
                      { label: "Resumes Created", value: String(resumes.length), trend: "Live database count", icon: FileText },
                      { label: "Analyses Conducted", value: String(resumesWithScore.length), trend: "Analyzed documents", icon: BarChart3 },
                      { label: "Avg ATS Score", value: avgScore !== null ? `${avgScore}%` : "—", trend: avgScore !== null ? "Average of reports" : "Not analyzed yet", icon: Target, isGreen: avgScore !== null },
                    ].map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#F1F3F6] border border-border/20 flex items-center justify-center">
                            <stat.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-base font-extrabold text-foreground leading-none">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-none">{stat.label}</p>
                          </div>
                        </div>
                        <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                          stat.isGreen 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                            : "bg-[#F1F3F6] border-border text-muted-foreground"
                        )}>
                          {stat.trend}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
