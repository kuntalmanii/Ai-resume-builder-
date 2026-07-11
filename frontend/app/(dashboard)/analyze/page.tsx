/**
 * Interactive ATS Analysis and Job Matching Page.
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Target, Upload, FileText, Sparkles, HelpCircle, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AtsScoreRing, CategoryScoreBar } from "@/components/ui/ats-score";
import { KeywordGrid } from "@/components/ui/keyword-chips";
import { IssueCard, Issue } from "@/components/ui/issue-card";
import { UploadDropzone, ParsingProgress, ParsingStep } from "@/components/ui/upload-dropzone";
import { EvidencePanel, EvidenceItem } from "@/components/ui/evidence-panel";
import { toast } from "sonner";

export default function AnalyzePage() {
  const [activeTab, setActiveTab] = useState<"ats" | "jd">("ats");
  
  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Parsing step progress mockup
  const [parsingSteps, setParsingSteps] = useState<ParsingStep[]>([
    { label: "Extracting text", status: "pending" },
    { label: "Detecting sections", status: "pending" },
    { label: "Analyzing structure", status: "pending" },
    { label: "Running ATS check", status: "pending" },
    { label: "Generating suggestions", status: "pending" },
  ]);

  // Evidence panel state
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  // Issues list
  const mockIssues: Issue[] = [
    {
      id: "issue-1",
      category: "Impact Language",
      severity: "high",
      title: "Vague Action Verbs",
      originalText: "Worked on frontend development.",
      explanation: "Lacks strong action verbs and measurable outcomes. Replace with quantifiable achievements.",
    },
    {
      id: "issue-2",
      category: "Quantification",
      severity: "medium",
      title: "Missing Performance Metrics",
      originalText: "Led cross-functional design workshops.",
      explanation: "No metric found for roadmap acceleration or delivery impact. Consider adding target percentages.",
    },
    {
      id: "issue-3",
      category: "Keywords",
      severity: "low",
      title: "Missing Key Tech Skills",
      originalText: undefined,
      explanation: "Recommended keywords like 'TypeScript' and 'Docker' are missing from your core skills group.",
    },
  ];

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    toast.success(`Uploading "${file.name}"...`);

    setTimeout(() => {
      setIsUploading(false);
      setIsParsing(true);
      runParsingAnimation();
    }, 1200);
  };

  const runParsingAnimation = () => {
    let currentStep = 0;
    const interval = setInterval(() => {
      setParsingSteps((prev) => {
        const next = [...prev];
        if (currentStep > 0) {
          next[currentStep - 1].status = "done";
        }
        if (currentStep < next.length) {
          next[currentStep].status = "progress";
        }
        return next;
      });

      currentStep += 1;
      if (currentStep > 5) {
        clearInterval(interval);
        setTimeout(() => {
          setIsParsing(false);
          setShowAnalysis(true);
          toast.success("Analysis complete! Review report below.");
        }, 600);
      }
    }, 800);
  };

  const handleFixWithAi = (issueId: string) => {
    toast.info("Navigating to AI workspace for suggestions...");
    // Simulate workspace redirection delay
    setTimeout(() => {
      window.location.href = "/resumes/new";
    }, 500);
  };

  const handleViewEvidence = (issueId: string) => {
    setActiveIssueId(issueId);
    setIsEvidenceOpen(true);
  };

  const getEvidenceList = (): EvidenceItem[] => {
    if (activeIssueId === "issue-1") {
      return [
        { type: "resume", title: "FROM YOUR RESUME", content: "Section: Professional Experience - 'Worked on frontend development.'" },
        { type: "profile", title: "FROM YOUR CAREER PROFILE", content: "Strong skills registered: 'React, Redux, frontend modules'" }
      ];
    }
    return [
      { type: "profile", title: "FROM YOUR CAREER PROFILE", content: "Design workshop coordinator for Agile projects." }
    ];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analyze Resume</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluate your resume against ATS criteria or match it against a specific job posting.
          </p>
        </div>

        {/* Mode Tab Switches */}
        <div className="flex bg-muted rounded-md p-1 border border-border shrink-0 max-w-fit">
          <button
            onClick={() => setActiveTab("ats")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
              activeTab === "ats" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            ATS Audit
          </button>
          <button
            onClick={() => setActiveTab("jd")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
              activeTab === "jd" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Job Description Matcher
          </button>
        </div>
      </div>

      {activeTab === "ats" ? (
        <div className="space-y-6">
          {!showAnalysis ? (
            <div className="max-w-xl mx-auto space-y-6 py-8">
              {!isParsing ? (
                <UploadDropzone
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                />
              ) : (
                <ParsingProgress
                  steps={parsingSteps}
                  fileName={uploadedFile?.name}
                />
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Column: ATS Score Cards */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-card border-border text-foreground shadow-sm">
                  <CardContent className="p-5 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                      Overall ATS Score
                    </span>
                    <AtsScoreRing score={78} />
                    
                    <div className="w-full space-y-4 mt-6 border-t border-border-subtle pt-5">
                      <CategoryScoreBar label="Impact Words" score={90} />
                      <CategoryScoreBar label="Quantification" score={72} />
                      <CategoryScoreBar label="Action Verbs" score={95} />
                      <CategoryScoreBar label="ATS Format" score={80} />
                      <CategoryScoreBar label="Completeness" score={65} />
                      <CategoryScoreBar label="Length" score={88} />
                      <CategoryScoreBar label="Keywords" score={48} />
                    </div>
                  </CardContent>
                </Card>

                {/* Reset analysis button */}
                <Button
                  onClick={() => {
                    setShowAnalysis(false);
                    setUploadedFile(null);
                  }}
                  variant="outline"
                  className="w-full text-xs font-semibold h-[36px] border-border hover:bg-muted/50"
                >
                  Upload Another Resume
                </Button>
              </div>

              {/* Right Column: Keyword Match & Detailed Issues */}
              <div className="lg:col-span-2 space-y-6">
                {/* Keyword Tagging Card */}
                <Card className="bg-card border-border text-foreground shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Keyword Mapping Analysis</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We scanned skills matching standard Product Management roles.
                      </p>
                    </div>

                    <KeywordGrid
                      keywords={[
                        { label: "React", type: "exact" },
                        { label: "Product Roadmap", type: "exact" },
                        { label: "Node.js", type: "semantic", semanticDetail: "Semantically matched to backend development" },
                        { label: "TypeScript", type: "missing" },
                        { label: "Docker", type: "missing" },
                        { label: "Agile Workshops", type: "exact" },
                        { label: "Figma", type: "exact" },
                      ]}
                      onAddKeyword={(lbl) => toast.success(`Added keyword: ${lbl}`)}
                    />
                  </CardContent>
                </Card>

                {/* Detailed Issues Checklist */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider pl-1">
                    Areas of Improvement ({mockIssues.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {mockIssues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        onFixWithAi={handleFixWithAi}
                        onViewEvidence={handleViewEvidence}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        /* Job Description Matcher Tab */
        <Card className="bg-card border-border text-foreground shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Match Job Posting</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste the job description text below to compare and check for missing skills.
              </p>
            </div>
            
            <textarea
              rows={6}
              placeholder="Paste Job Description / Qualifications here..."
              className="w-full bg-[#F1F3F6] border border-border rounded-sm p-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
            />

            <div className="flex justify-end">
              <Button
                onClick={() => toast.success("Scanning Job Description...")}
                className="h-[36px] bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4"
              >
                Scan & Compare
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slide-out Evidence panel drawer */}
      <EvidencePanel
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        title="Issue Evidence Lookup"
        evidenceItems={getEvidenceList()}
      />
    </div>
  );
}
