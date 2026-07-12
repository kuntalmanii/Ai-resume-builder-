/**
 * Resumes List Page showing user resumes, ATS scores, and actions.
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AtsScoreRing } from "@/components/ui/ats-score";
import { SkeletonResumeCard } from "@/components/ui/skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResumeItem {
  id: string;
  title: string;
  updatedAt: string;
  score: number;
}

const mockResumes: ResumeItem[] = [
  {
    id: "resume-1",
    title: "Product Manager 2024",
    updatedAt: "Last edited 2 hours ago",
    score: 78,
  },
  {
    id: "resume-2",
    title: "Software Engineer Lead",
    updatedAt: "Last edited 1 day ago",
    score: 92,
  },
];

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>(mockResumes);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate premium dashboard loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = (id: string, title: string) => {
    setResumes(resumes.filter((r) => r.id !== id));
    toast.success(`"${title}" deleted successfully`);
    setActiveMenuId(null);
  };

  const filteredResumes = resumes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting
  const sortedResumes = [...filteredResumes].sort((a, b) => {
    if (sortBy === "score") {
      return b.score - a.score;
    }
    // Simple fallback since it's mock date logic
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Resumes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, manage, and optimize your resume matching parameters.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
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
          <Link href="/resumes/new">
            <Button
              id="create-resume-btn"
              className="h-[36px] bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              New Resume
            </Button>
          </Link>
        </div>
      </div>

      {resumes.length === 0 ? (
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
              {/* Sort selector */}
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

              {/* Grid / List toggle */}
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

          {/* Grid / List Content */}
          {isLoading ? (
            <div className={cn("grid gap-6", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
              {[1, 2, 3].map((i) => (
                <SkeletonResumeCard key={i} />
              ))}
            </div>
          ) : sortedResumes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-card/40">
              No matching resumes found.
            </div>
          ) : viewMode === "grid" ? (
            /* Grid Layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedResumes.map((resume) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4 shadow-sm hover:shadow-md hover:border-border-strong group transition-all duration-200 relative"
                >
                  {/* Rich A4 Styled Thumbnail Preview */}
                  <div className="w-full h-[180px] bg-[#F9FAFB] dark:bg-[#121214] rounded-lg border border-border/40 flex flex-col gap-2 p-3 overflow-hidden select-none relative group-hover:bg-muted/10 transition-colors">
                    {/* Tiny Paper Mock lines */}
                    <div className="w-[30%] h-1.5 bg-primary/20 rounded-xs mx-auto mb-1" />
                    <div className="w-[50%] h-1 bg-muted-foreground/20 rounded-xs mx-auto mb-2" />
                    
                    <div className="h-[1px] bg-border w-full my-1" />
                    
                    <div className="space-y-1.5">
                      <div className="w-[20%] h-1 bg-primary/30 rounded-xs" />
                      <div className="w-full h-1 bg-muted-foreground/10 rounded-xs" />
                      <div className="w-[85%] h-1 bg-muted-foreground/10 rounded-xs" />
                    </div>

                    <div className="space-y-1.5 mt-2">
                      <div className="w-[25%] h-1 bg-primary/30 rounded-xs" />
                      <div className="w-[90%] h-1 bg-muted-foreground/10 rounded-xs" />
                      <div className="w-[70%] h-1 bg-muted-foreground/10 rounded-xs" />
                    </div>

                    {/* Compact ATS Score Overlay Badge */}
                    <div className="absolute top-2 right-2 bg-card border border-border/80 rounded-full p-1.5 shadow-md group-hover:scale-105 transition-transform">
                      <AtsScoreRing score={resume.score} size="sm" />
                    </div>
                  </div>

                  {/* Title & Timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground leading-snug truncate max-w-[180px]">
                        {resume.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {resume.updatedAt}
                      </p>
                    </div>

                    {/* Desktop/Tablet Context Dropdown Trigger */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveMenuId(activeMenuId === resume.id ? null : resume.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {/* Floating Action Menu dropdown */}
                      <AnimatePresence>
                        {activeMenuId === resume.id && (
                          <>
                            {/* Overlay layer to close dropdown when clicking out */}
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-9 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-20 font-medium"
                            >
                              <Link href={`/resumes/${resume.id}/edit`}>
                                <button className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground">
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit Resume
                                </button>
                              </Link>
                              <Link href={`/resumes/${resume.id}/analyze`}>
                                <button className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground">
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  Analyze ATS
                                </button>
                              </Link>
                              <Link href={`/resumes/${resume.id}/match`}>
                                <button className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground">
                                  <Target className="w-3.5 h-3.5" />
                                  Match JD
                                </button>
                              </Link>
                              <Link href={`/resumes/${resume.id}/improve`}>
                                <button className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-foreground">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  AI Suggestions
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDelete(resume.id, resume.title)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-error flex items-center gap-2 border-t border-border/50 mt-1 pt-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Draft
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* List Layout */
            <div className="space-y-3">
              {sortedResumes.map((resume) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border-strong transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{resume.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{resume.updatedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">ATS Score:</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full border",
                        resume.score >= 85 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" 
                          : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                      )}>
                        {resume.score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/resumes/${resume.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/resumes/${resume.id}/analyze`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary">
                          Analyze
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleDelete(resume.id, resume.title)}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-error hover:bg-error-subtle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
