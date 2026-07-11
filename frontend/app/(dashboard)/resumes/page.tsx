/**
 * Resumes List Page showing user resumes, ATS scores, and actions.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, PlusCircle, Upload, Download, Trash2, Edit2, BarChart3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AtsScoreRing } from "@/components/ui/ats-score";
import { toast } from "sonner";

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

  const handleDelete = (id: string, title: string) => {
    setResumes(resumes.filter((r) => r.id !== id));
    toast.success(`"${title}" deleted successfully`);
  };

  const filteredResumes = resumes.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Link href="/resumes/upload">
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
              <Link href="/resumes/upload">
                <Button variant="outline" className="h-[36px] border-border text-xs font-semibold">
                  Upload Existing
                </Button>
              </Link>
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] bg-card border border-border rounded-md pl-9 pr-4 text-xs font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
            />
          </div>

          {/* Grid list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map((resume) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-md p-4 flex flex-col gap-4 shadow-xs hover:shadow-md hover:border-border-strong group transition-all duration-200"
              >
                {/* Scaled resume layout preview area */}
                <div className="w-full h-[180px] bg-[#F1F3F6] rounded-xs border border-border/20 flex flex-col gap-2 p-3 overflow-hidden select-none relative group-hover:bg-muted/30 transition-colors">
                  <div className="w-[30%] h-1.5 bg-text-secondary/15 rounded-xs mx-auto" />
                  <div className="w-[50%] h-1 bg-text-muted/10 rounded-xs mx-auto mb-1" />
                  <div className="h-[1px] bg-border/40 w-full my-1" />
                  <div className="space-y-1">
                    <div className="w-[20%] h-1 bg-primary/20 rounded-xs" />
                    <div className="w-full h-1 bg-text-muted/5 rounded-xs" />
                    <div className="w-[85%] h-1 bg-text-muted/5 rounded-xs" />
                  </div>
                  <div className="space-y-1 mt-1">
                    <div className="w-[25%] h-1 bg-primary/20 rounded-xs" />
                    <div className="w-[90%] h-1 bg-text-muted/5 rounded-xs" />
                    <div className="w-[70%] h-1 bg-text-muted/5 rounded-xs" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug truncate max-w-[150px]">
                      {resume.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {resume.updatedAt}
                    </p>
                  </div>
                  {/* Compact ATS Score Ring */}
                  <AtsScoreRing score={resume.score} size="sm" className="shrink-0" />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 border-t border-border-subtle pt-3 mt-auto">
                  <Link href={`/resumes/${resume.id}`}>
                    <Button variant="ghost" size="sm" className="h-[28px] px-2 text-xs font-semibold text-primary hover:bg-primary-subtle border-0">
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/analyze?resume=${resume.id}`}>
                    <Button variant="ghost" size="sm" className="h-[28px] px-2 text-xs font-semibold text-text-secondary hover:bg-muted/50 border-0">
                      <BarChart3 className="w-3.5 h-3.5 mr-1" />
                      Analyze
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleDelete(resume.id, resume.title)}
                    variant="ghost"
                    size="sm"
                    className="h-[28px] px-2 text-xs text-error hover:bg-error-subtle border-0 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
