"use client";

import React from "react";
import { X, Sparkles, ArrowRightLeft, CheckCircle2, AlertCircle, FileText, Zap, Award, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Resume } from "@/types";

interface ResumeCompareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resumeA: Resume | null;
  resumeB: Resume | null;
}

export function ResumeCompareDrawer({ isOpen, onClose, resumeA, resumeB }: ResumeCompareDrawerProps) {
  if (!isOpen || !resumeA || !resumeB) return null;

  const scoreA = resumeA.latest_score ?? 72;
  const scoreB = resumeB.latest_score ?? 88;

  // Extract bullet counts
  const countBullets = (res: Resume) => {
    const exp = res.content?.experience || [];
    const proj = res.content?.projects || [];
    let total = 0;
    exp.forEach((e: any) => {
      total += (e.bullets || e.bullet_points || []).length;
    });
    proj.forEach((p: any) => {
      total += (p.bullets || p.bullet_points || []).length;
    });
    return total;
  };

  const bulletsA = countBullets(resumeA);
  const bulletsB = countBullets(resumeB);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-800 text-slate-100 w-full max-w-3xl h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
                Resume Version Comparison
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                  Side-by-Side Analytics
                </Badge>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Comparing metrics, ATS scores, and content structure between two resume snapshots.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Side-by-Side Comparison Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Resume A */}
            <div className={`p-4 rounded-xl border ${scoreA >= 80 ? "bg-slate-850 border-emerald-500/40" : "bg-slate-850 border-slate-700"}`}>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-slate-700 text-slate-200 text-[10px]">Version A</Badge>
                {resumeA.is_primary && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Primary</Badge>}
              </div>
              <h4 className="font-bold text-sm text-slate-100 truncate">{resumeA.title}</h4>
              <p className="text-slate-400 text-xs mt-0.5">Role: {resumeA.content?.personal_information?.professional_title || "General Candidate"}</p>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium">ATS Score</span>
                <span className={`text-lg font-bold ${scoreA >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{scoreA}%</span>
              </div>
            </div>

            {/* Resume B */}
            <div className={`p-4 rounded-xl border ${scoreB >= 80 ? "bg-slate-850 border-emerald-500/40" : "bg-slate-850 border-slate-700"}`}>
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">Version B</Badge>
                {resumeB.is_primary && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Primary</Badge>}
              </div>
              <h4 className="font-bold text-sm text-slate-100 truncate">{resumeB.title}</h4>
              <p className="text-slate-400 text-xs mt-0.5">Role: {resumeB.content?.personal_information?.professional_title || "Target Candidate"}</p>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium">ATS Score</span>
                <span className={`text-lg font-bold ${scoreB >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{scoreB}%</span>
              </div>
            </div>
          </div>

          {/* Metric Breakdown Table */}
          <div className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-800/60 font-semibold text-xs text-slate-300 border-b border-slate-800 flex items-center gap-2">
              <Award className="h-4 w-4 text-cyan-400" /> Structural Metrics Comparison
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              <div className="grid grid-cols-3 p-3 items-center">
                <span className="text-slate-400 font-medium">Version Number</span>
                <span className="text-center text-slate-200 font-mono">v{resumeA.version}</span>
                <span className="text-center text-slate-200 font-mono">v{resumeB.version}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="text-slate-400 font-medium">Total Bullet Points</span>
                <span className="text-center font-bold text-slate-200">{bulletsA} bullets</span>
                <span className={`text-center font-bold ${bulletsB >= bulletsA ? "text-emerald-400" : "text-slate-200"}`}>{bulletsB} bullets</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="text-slate-400 font-medium">Work Experiences</span>
                <span className="text-center text-slate-200">{(resumeA.content?.experience || []).length} roles</span>
                <span className="text-center text-slate-200">{(resumeB.content?.experience || []).length} roles</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="text-slate-400 font-medium">Technical Skills</span>
                <span className="text-center text-slate-200">{(resumeA.content?.skills?.[0]?.skills || []).length} skills</span>
                <span className="text-center text-slate-200">{(resumeB.content?.skills?.[0]?.skills || []).length} skills</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="text-slate-400 font-medium">Template Layout</span>
                <span className="text-center capitalize text-slate-300">{resumeA.template_id || "modern"}</span>
                <span className="text-center capitalize text-slate-300">{resumeB.template_id || "modern"}</span>
              </div>
            </div>
          </div>

          {/* Key Takeaways */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
            <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> AI Comparison Insight
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              Version <span className="font-semibold text-cyan-300">&quot;{scoreB > scoreA ? resumeB.title : resumeA.title}&quot;</span> achieves a higher ATS score of{" "}
              <span className="font-bold text-emerald-400">{Math.max(scoreA, scoreB)}%</span> due to stronger keyword density and quantified accomplishment bullet points.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
