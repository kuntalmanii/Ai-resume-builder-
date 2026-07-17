"use client";

import { useState, useEffect } from "react";
import { Map, Sparkles, CheckSquare, Square, Award, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { roadmapsAPI } from "@/lib/api";
import { toast } from "sonner";

interface RoadmapStep {
  title: string;
  description: string;
  skills: string[];
  resources: string[];
  is_completed?: boolean;
}

interface Roadmap {
  id: string;
  target_role: string;
  target_company?: string;
  current_skills: { items: string[] };
  target_skills: { items: string[] };
  plan: { items: RoadmapStep[] };
  progress: { items: boolean[] };
  status: string;
  created_at: string;
}

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);

  // Forms
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");

  const fetchRoadmaps = async () => {
    try {
      setLoading(true);
      const data = await roadmapsAPI.list();
      setRoadmaps(data);
      if (data.length > 0) {
        setActiveRoadmap(data[0]);
      }
    } catch (err) {
      toast.error("Failed to load roadmaps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) {
      toast.error("Please enter your target role.");
      return;
    }
    try {
      setGenerating(true);
      const res = await roadmapsAPI.generate({
        target_role: targetRole,
        target_company: targetCompany || undefined,
      });
      toast.success("Personalized career roadmap generated!");
      setActiveRoadmap(res);
      fetchRoadmaps();
    } catch (err) {
      toast.error("Failed to generate career roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleStep = async (stepIdx: number, isCompleted: boolean) => {
    if (!activeRoadmap) return;
    try {
      // Optmistic UI update
      const updatedPlan = [...activeRoadmap.plan.items];
      updatedPlan[stepIdx] = { ...updatedPlan[stepIdx], is_completed: isCompleted };
      
      const updatedRoadmap = {
        ...activeRoadmap,
        plan: { items: updatedPlan }
      };
      setActiveRoadmap(updatedRoadmap);

      // Call API
      await roadmapsAPI.updateProgress(activeRoadmap.id, stepIdx, isCompleted);
      toast.success("Progress saved!");
      
      // Silent refresh
      const data = await roadmapsAPI.list();
      setRoadmaps(data);
    } catch (err) {
      toast.error("Failed to update step progress.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white">
          <Map className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Upskilling Career Roadmaps
          </h1>
          <p className="text-muted-foreground mt-1">
            Flow-charts detailing target skills, study milestones, and execution tracks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Generation column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Build New Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Career Role *</label>
                  <Input
                    placeholder="Staff Reliability Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Company (Optional)</label>
                  <Input
                    placeholder="Google"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Gap...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Generate Roadmap Plan
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Your Roadmaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roadmaps.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No roadmaps generated yet.
                </div>
              ) : (
                roadmaps.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveRoadmap(r)}
                    className={`p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/30 transition-all flex items-center justify-between ${
                      activeRoadmap?.id === r.id ? "border-primary bg-primary-subtle text-primary" : "border-border"
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate max-w-[150px]">
                        {r.target_role}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.target_company ? `@ ${r.target_company}` : "General Up-skill"}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Flowchart/Milestone Checklist Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeRoadmap ? (
            <div className="space-y-6">
              {/* Gap Analysis Summary Card */}
              <Card className="border border-border bg-card">
                <CardContent className="p-6">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider mb-3">
                    Skill Gap Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100/60 dark:bg-emerald-950/15 dark:border-emerald-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                        Current Profile Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeRoadmap.current_skills.items.map((s) => (
                          <Badge key={s} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100/60 dark:bg-indigo-950/15 dark:border-indigo-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                        Target Skills Needed
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeRoadmap.target_skills.items.map((s) => (
                          <Badge key={s} className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-none text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones Flow-chart List */}
              <div className="space-y-4">
                {activeRoadmap.plan.items.map((step, idx) => {
                  const isCompleted = step.is_completed || false;
                  return (
                    <div key={idx} className="relative flex gap-4 items-start group">
                      {/* Interactive Milestone Indicator */}
                      <button
                        onClick={() => handleToggleStep(idx, !isCompleted)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all z-10 bg-card ${
                          isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border hover:border-violet-500"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
                      </button>

                      {/* Connection line */}
                      {idx !== activeRoadmap.plan.items.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border/60 group-hover:bg-violet-300 transition-colors -z-0" />
                      )}

                      <Card className={`flex-1 border transition-all ${
                        isCompleted ? "border-emerald-100 bg-emerald-50/10 dark:border-emerald-950/20" : "border-border hover:border-violet-200"
                      }`}>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h4 className={`font-bold text-sm ${isCompleted ? "text-slate-500 line-through" : "text-foreground"}`}>
                              {step.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {step.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {step.skills.map((sk) => (
                              <Badge key={sk} variant="outline" className="text-[9px] px-2">
                                {sk}
                              </Badge>
                            ))}
                          </div>

                          {step.resources && step.resources.length > 0 && (
                            <div className="pt-2 border-t border-border/40 text-[10px] space-y-1">
                              <span className="font-bold text-muted-foreground">Study Resources:</span>
                              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground/80">
                                {step.resources.map((res, rIdx) => (
                                  <li key={rIdx}>{res}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-96 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
              <Map className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-foreground text-lg">No roadmap loaded</h3>
              <p className="max-w-xs text-xs mt-1">
                Enter your target up-skilling objectives on the left to lay down interactive milestone checklist tracks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
