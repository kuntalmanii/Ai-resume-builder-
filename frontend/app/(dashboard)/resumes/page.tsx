/**
 * Resumes List Page showing user resumes, ATS scores, and actions.
 * Executive UI/UX Redesign with telemetry cards & side-by-side comparison.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  PlusCircle,
  Upload,
  Download,
  Trash2,
  Edit2,
  BarChart3,
  Search,
  LayoutGrid,
  LayoutList,
  MoreVertical,
  ArrowUpDown,
  Eye,
  Target,
  Sparkles,
  Copy,
  Star,
  ArrowRightLeft,
  Zap,
  TrendingUp,
  Award,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AtsScoreRing } from "@/components/ui/ats-score";
import { SkeletonResumeCard } from "@/components/ui/skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resumesAPI } from "@/lib/api";
import type { Resume } from "@/types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ResumeCompareDrawer } from "@/components/resume/ResumeCompareDrawer";

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return `Edited ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return "Recently edited";
  }
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  // Selection & Comparison State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    if (activeMenuId === null) return;
    
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.resume-menu-container')) {
        setActiveMenuId(null);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeMenuId]);

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      const data = await resumesAPI.list();
      setResumes(data);
    } catch {
      toast.error("Failed to load resumes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    try {
      await resumesAPI.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      toast.success(`"${title}" deleted successfully`);
    } catch {
      toast.error(`Failed to delete "${title}"`);
    }
    setActiveMenuId(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await resumesAPI.duplicate(id);
      setResumes((prev) => [dup, ...prev]);
      toast.success(`Duplicated "${dup.title}" successfully`);
    } catch {
      toast.error("Failed to duplicate resume.");
    }
    setActiveMenuId(null);
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await resumesAPI.setPrimary(id);
      fetchResumes();
      toast.success("Primary resume updated successfully");
    } catch {
      toast.error("Failed to set primary resume.");
    }
    setActiveMenuId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        toast.info("Select up to 2 resumes to compare side-by-side.");
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const filteredResumes = resumes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting
  const sortedResumes = [...filteredResumes].sort((a, b) => {
    if (sortBy === "score") {
      const scoreA = a.latest_score ?? 0;
      const scoreB = b.latest_score ?? 0;
      return scoreB - scoreA;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Calculate Telemetry Header Stats
  const totalResumes = resumes.length;
  const avgScore = totalResumes > 0 
    ? Math.round(resumes.reduce((acc, curr) => acc + (curr.latest_score || 75), 0) / totalResumes) 
    : 0;
  const primaryResume = resumes.find((r) => r.is_primary) || resumes[0];

  const compareA = resumes.find((r) => r.id === selectedIds[0]) || null;
  const compareB = resumes.find((r) => r.id === selectedIds[1]) || null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            My Resumes Workspace
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              {totalResumes} Active
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your ATS-optimized resume snapshots and leverage 1-click Google X-Y-Z AI tailoring.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {selectedIds.length === 2 && (
            <Button
              onClick={() => setIsCompareOpen(true)}
              className="h-[36px] bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 shadow-md shadow-cyan-900/20"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
              Compare (2 Selected)
            </Button>
          )}

          <Link href="/resumes/new">
            <Button
              id="create-resume-btn"
              className="h-[36px] bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              New Resume
            </Button>
          </Link>
          <Link href="/upload">
            <Button
              id="upload-resume-btn"
              variant="outline"
              className="h-[36px] border-border text-xs font-semibold hover:bg-muted/50"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Executive Telemetry Header */}
      {totalResumes > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Resumes</div>
              <div className="text-xl font-bold text-foreground">{totalResumes} Version Snapshots</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg ATS Score</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{avgScore}% Readiness</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Primary Resume</div>
              <div className="text-sm font-bold text-foreground truncate">{primaryResume?.title || "None Set"}</div>
            </div>
          </div>
        </div>
      )}

      {resumes.length === 0 && !isLoading ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-muted-foreground/60" />}
          title="No resumes yet"
          description="Create a resume from scratch or upload your existing PDF/DOCX to check your score."
          actions={
            <>
              <Link href="/resumes/new">
                <Button className="h-[36px] bg-primary text-primary-foreground text-xs font-semibold px-4">
                  Create Resume
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="outline" className="h-[36px] border-border text-xs font-semibold">
                  Upload Existing
                </Button>
              </Link>
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[36px] bg-card border border-border rounded-lg pl-9 pr-4 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
              />
            </div>

            {/* View Mode & Sorting */}
            <div className="flex items-center gap-2 justify-end">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "score")}
                  className="appearance-none h-[36px] bg-card border border-border rounded-lg pl-8 pr-8 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 cursor-pointer"
                >
                  <option value="date">Last Edited</option>
                  <option value="score">ATS Score</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="border border-border rounded-lg p-0.5 flex bg-muted shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Display */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonResumeCard />
              <SkeletonResumeCard />
              <SkeletonResumeCard />
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedResumes.map((resume) => {
                const score = resume.latest_score ?? 78;
                const isSelected = selectedIds.includes(resume.id);

                return (
                  <motion.div
                    key={resume.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group relative p-5 rounded-xl border bg-card hover:shadow-lg transition-all duration-200 flex flex-col justify-between",
                      isSelected ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/5" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(resume.id)}
                            className="rounded border-border text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                            title="Select to compare"
                          />
                          {resume.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> Primary
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            v{resume.version}
                          </span>
                        </div>

                        {/* Dropdown Menu */}
                        <div className="relative resume-menu-container">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === resume.id ? null : resume.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          <AnimatePresence>
                            {activeMenuId === resume.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-6 z-20 w-44 bg-card border border-border rounded-lg shadow-xl py-1 text-xs"
                              >
                                {!resume.is_primary && (
                                  <button
                                    onClick={() => handleSetPrimary(resume.id)}
                                    className="w-full px-3 py-2 text-left text-foreground hover:bg-muted flex items-center gap-2"
                                  >
                                    <Star className="w-3.5 h-3.5 text-amber-500" /> Set as Primary
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDuplicate(resume.id)}
                                  className="w-full px-3 py-2 text-left text-foreground hover:bg-muted flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Duplicate
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(resume.id);
                                    setDeleteConfirmTitle(resume.title);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Title & Date */}
                      <Link href={`/resumes/${resume.id}/edit`}>
                        <h3 className="font-semibold text-foreground text-sm hover:text-primary transition-colors line-clamp-1">
                          {resume.title}
                        </h3>
                      </Link>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDate(resume.updated_at)}
                      </p>
                    </div>

                    {/* ATS Score & Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`text-base font-bold ${score >= 80 ? "text-emerald-500" : "text-amber-500"}`}>
                          {score}%
                        </div>
                        <span className="text-[10px] text-muted-foreground">ATS Score</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link href={`/resumes/${resume.id}/edit`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          >
                            <Sparkles className="w-3 h-3 mr-1" /> Tailor
                          </Button>
                        </Link>
                        <Link href={`/resumes/${resume.id}/edit`}>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              {sortedResumes.map((resume) => (
                <div key={resume.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(resume.id)}
                      onChange={() => toggleSelect(resume.id)}
                      className="rounded border-border text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                    />
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Link href={`/resumes/${resume.id}/edit`}>
                        <h4 className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                          {resume.title}
                        </h4>
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(resume.updated_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-500">{resume.latest_score ?? 78}%</div>
                      <div className="text-[10px] text-muted-foreground">ATS Score</div>
                    </div>

                    <Link href={`/resumes/${resume.id}/edit`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Resume"
        description={`Are you sure you want to delete "${deleteConfirmTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirmId) {
            handleDelete(deleteConfirmId, deleteConfirmTitle);
            setDeleteConfirmId(null);
          }
        }}
      />

      {/* Resume Side-by-Side Compare Drawer */}
      <ResumeCompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        resumeA={compareA}
        resumeB={compareB}
      />
    </div>
  );
}
