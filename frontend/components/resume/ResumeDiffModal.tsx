"use client";

import React, { useState } from "react";
import { Sparkles, Check, X, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BulletDiffItem {
  bullet_id: string;
  section_name: string;
  item_title: string;
  original_bullet: string;
  tailored_bullet: string;
  xyz_structure?: {
    accomplishment: string;
    metric: string;
    action: string;
  };
  matched_keywords?: string[];
  status?: string;
}

export interface TailorResponseData {
  resume_id: string;
  original_version: number;
  tailored_version: number;
  target_role: string;
  estimated_ats_score_before: number;
  estimated_ats_score_after: number;
  bullets: BulletDiffItem[];
}

interface ResumeDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffData: TailorResponseData | null;
  onApply: (acceptedBullets: BulletDiffItem[]) => void;
}

export function ResumeDiffModal({ isOpen, onClose, diffData, onApply }: ResumeDiffModalProps) {
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});

  if (!isOpen || !diffData) return null;

  const toggleDecision = (id: string, decision: "accepted" | "rejected") => {
    setDecisions((prev) => ({
      ...prev,
      [id]: prev[id] === decision ? "accepted" : decision,
    }));
  };

  const handleApplyAll = () => {
    const accepted = diffData.bullets.filter((b) => decisions[b.bullet_id] !== "rejected");
    onApply(accepted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
                Google X-Y-Z AI Resume Tailor
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                  Grounded AI
                </Badge>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Tailored for <span className="font-semibold text-emerald-400">{diffData.target_role}</span> using Google&apos;s accomplishment framework.
              </p>
            </div>
          </div>

          {/* ATS Score Improvement Banner */}
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Est. ATS Score</div>
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <span className="text-slate-400">{diffData.estimated_ats_score_before}%</span>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">{diffData.estimated_ats_score_after}%</span>
              </div>
            </div>
            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Zero Fake Metrics &bull; Grounded in actual candidate experience
            </span>
            <span>{diffData.bullets.length} Tailored Suggestions</span>
          </div>

          <div className="space-y-4">
            {diffData.bullets.map((item) => {
              const status = decisions[item.bullet_id] || "accepted";
              const isAccepted = status === "accepted";

              return (
                <div
                  key={item.bullet_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isAccepted
                      ? "bg-slate-800/70 border-slate-700 shadow-md"
                      : "bg-slate-900/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-700 text-slate-200 text-xs">{item.section_name}</Badge>
                      <span className="text-xs font-semibold text-slate-300">{item.item_title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isAccepted ? "default" : "outline"}
                        onClick={() => toggleDecision(item.bullet_id, "accepted")}
                        className={
                          isAccepted
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white h-7 px-3 text-xs"
                            : "border-slate-700 text-slate-400 h-7 px-3 text-xs"
                        }
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant={!isAccepted ? "destructive" : "outline"}
                        onClick={() => toggleDecision(item.bullet_id, "rejected")}
                        className={
                          !isAccepted
                            ? "bg-rose-900/80 hover:bg-rose-800 text-rose-200 h-7 px-3 text-xs border-rose-700"
                            : "border-slate-700 text-slate-400 h-7 px-3 text-xs"
                        }
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>

                  {/* Red Original vs Green Tailored */}
                  <div className="space-y-2 text-xs mt-3">
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/40 text-rose-300 font-mono leading-relaxed">
                      <span className="font-bold text-rose-400 mr-2">- Original:</span>
                      <span className="line-through">{item.original_bullet}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 font-mono leading-relaxed">
                      <span className="font-bold text-emerald-400 mr-2">+ Google X-Y-Z:</span>
                      <span>{item.tailored_bullet}</span>
                    </div>
                  </div>

                  {/* X-Y-Z Framework Breakdown Pills */}
                  {item.xyz_structure && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="bg-slate-850 p-2 rounded-lg border border-slate-700/40">
                        <span className="text-emerald-400 font-bold mr-1">[X] Impact:</span>
                        <span className="text-slate-300">{item.xyz_structure.accomplishment}</span>
                      </div>
                      <div className="bg-slate-850 p-2 rounded-lg border border-slate-700/40">
                        <span className="text-amber-400 font-bold mr-1">[Y] Metric:</span>
                        <span className="text-slate-300">{item.xyz_structure.metric}</span>
                      </div>
                      <div className="bg-slate-850 p-2 rounded-lg border border-slate-700/40">
                        <span className="text-cyan-400 font-bold mr-1">[Z] Method:</span>
                        <span className="text-slate-300">{item.xyz_structure.action}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/90">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">
            Cancel
          </Button>
          <Button onClick={handleApplyAll} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30 text-xs">
            <Sparkles className="h-4 w-4 mr-2" /> Apply Tailored Bullet Points
          </Button>
        </div>
      </div>
    </div>
  );
}
