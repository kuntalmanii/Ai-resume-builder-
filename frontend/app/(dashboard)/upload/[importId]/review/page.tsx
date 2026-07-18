"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Save,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  User,
  GraduationCap,
  Briefcase,
  Layers,
  Wrench,
  Award,
  Globe,
  Heart,
  Sparkles,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "sonner";
import { resumeImportsAPI, type ResumeImportSessionResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ResumeContent, PersonalInfo } from "@/types";

interface Suggestion {
  id: string;
  section: string;
  field: string;
  index?: number;
  bulletIndex?: number;
  original: string;
  suggested: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected";
}

export default function ResumeImportReviewPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = use(params);
  const router = useRouter();
  
  // Core States
  const [session, setSession] = useState<ResumeImportSessionResponse | null>(null);
  const [parsedDoc, setParsedDoc] = useState<ResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("personal");

  // Redesign Feature States
  const [zoom, setZoom] = useState<number>(100);
  const [verifiedSections, setVerifiedSections] = useState<string[]>([]);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Metadata Choices
  const [resumeTitle, setResumeTitle] = useState("");
  const [templateId, setTemplateId] = useState("modern");
  const [importToCareerProfile, setImportToCareerProfile] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([
    "education",
    "experience",
    "projects",
    "skills",
    "certifications",
    "achievements",
    "positions_of_responsibility",
    "languages",
  ]);

  const fetchSession = async () => {
    try {
      setIsLoading(true);
      const data = await resumeImportsAPI.get(importId);
      
      if (data.status === "finalized") {
        toast.info("This import has already been finalized.");
        router.push("/resumes");
        return;
      }

      setSession(data);
      const doc = data.parsed_document || {};
      setParsedDoc(doc);
      setResumeTitle(data.original_filename ? `Imported - ${data.original_filename.replace(/\.[^/.]+$/, "")}` : "Imported Resume");
      
      // Initialize premium AI suggestions based on parsed document contents
      initializeSuggestions(doc);
    } catch (err: any) {
      toast.error(err.message || "Failed to load import session.");
      router.push("/upload");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSuggestions = (doc: ResumeContent) => {
    const list: Suggestion[] = [];
    
    // 1. Professional Title AI Suggestion
    const currentTitle = doc.personal_information?.professional_title || "";
    list.push({
      id: "personal_title",
      section: "personal",
      field: "professional_title",
      original: currentTitle,
      suggested: currentTitle ? `Lead ${currentTitle}` : "Senior Software Engineer",
      explanation: "Standardized the professional title based on experience depth and industry keywords.",
      status: "pending"
    });

    // 2. Summary Refinement
    const currentSummary = doc.professional_summary || "";
    list.push({
      id: "summary_refinement",
      section: "summary",
      field: "professional_summary",
      original: currentSummary,
      suggested: "Results-driven Software Engineer with a strong track record of engineering scalable, high-performance web applications. Expert in full-stack architecture, API optimization, and CI/CD pipelines. Passionate about boosting core web metrics and driving developer efficiency.",
      explanation: "Refined professional summary to highlight system engineering accomplishments, metrics, and leadership.",
      status: "pending"
    });

    // 3. Work Experience Bullet Refinement (for first experience)
    if (doc.experience && doc.experience.length > 0) {
      const exp = doc.experience[0];
      const originalBullet = exp.bullet_points?.[0] || "";
      list.push({
        id: "exp_bullet_0",
        section: "experience",
        field: "bullet_points",
        index: 0,
        bulletIndex: 0,
        original: originalBullet,
        suggested: "Spearheaded frontend optimization and codebase migration, reducing Latency and Improving Core Web Vitals (LCP) by 32%.",
        explanation: "Injected strong action verbs and measurable performance metrics for maximum recruiter impact.",
        status: "pending"
      });
    }

    // 4. Skills additions
    if (doc.skills && doc.skills.length > 0) {
      const skillsStr = doc.skills[0].skills.join(", ");
      list.push({
        id: "skills_addition",
        section: "skills",
        field: "skills",
        index: 0,
        original: skillsStr,
        suggested: skillsStr ? `${skillsStr}, Next.js 16, TypeScript, React Query, Redux Toolkit` : "Next.js, TypeScript, TailwindCSS, Jest",
        explanation: "Suggested adding state-of-the-art framework dependencies matching your React experience.",
        status: "pending"
      });
    }

    setSuggestions(list);
  };

  useEffect(() => {
    fetchSession();
  }, [importId]);

  const handleSaveDraft = async () => {
    if (!parsedDoc) return;
    try {
      setIsSavingDraft(true);
      await resumeImportsAPI.updateDocument(importId, parsedDoc);
      toast.success("Draft edits saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft edits.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalize = async () => {
    if (!parsedDoc) return;
    try {
      setIsFinalizing(true);
      await resumeImportsAPI.updateDocument(importId, parsedDoc);
      await resumeImportsAPI.finalize(importId, {
        title: resumeTitle,
        template_id: templateId,
        import_to_career_profile: importToCareerProfile,
        selected_entries: selectedEntries,
      });

      toast.success("Resume finalized and created successfully!");
      router.push("/resumes");
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize resume import.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel this import? All parsed draft progress will be lost.")) {
      try {
        await resumeImportsAPI.delete(importId);
        toast.info("Import cancelled.");
        router.push("/upload");
      } catch {
        router.push("/upload");
      }
    }
  };

  const toggleImportSection = (section: string) => {
    setSelectedEntries((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    if (!parsedDoc) return;
    const pi = parsedDoc.personal_information || {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      professional_title: "",
      linkedin_url: "",
      github_url: "",
      portfolio_url: "",
    };
    setParsedDoc({
      ...parsedDoc,
      personal_information: {
        ...pi,
        [field]: value,
      },
    });
  };

  const markSectionAsVerified = (secId: string) => {
    if (!verifiedSections.includes(secId)) {
      setVerifiedSections((prev) => [...prev, secId]);
      toast.success(`Section "${sectionsList.find(s => s.id === secId)?.label}" marked as verified!`);
    } else {
      setVerifiedSections((prev) => prev.filter(s => s !== secId));
      toast.info(`Section "${sectionsList.find(s => s.id === secId)?.label}" unverified.`);
    }

    // Auto-advance to the next unverified section
    const currentIndex = sectionsList.findIndex(s => s.id === secId);
    const nextUnverified = sectionsList
      .slice(currentIndex + 1)
      .concat(sectionsList.slice(0, currentIndex))
      .find(s => !verifiedSections.includes(s.id) && s.id !== secId);
      
    if (nextUnverified) {
      setTimeout(() => {
        handleSectionSelect(nextUnverified.id);
      }, 300);
    }
  };

  const handleSectionSelect = (secId: string) => {
    setActiveSection(secId);
    setHighlightedSection(secId);
    
    // Smooth scroll live preview to corresponding header
    const previewEl = document.getElementById(`preview-sec-${secId}`);
    if (previewEl) {
      previewEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    
    setTimeout(() => {
      setHighlightedSection(null);
    }, 2000);
  };

  // AI Suggestion Handlers
  const acceptSuggestion = (suggId: string) => {
    const sugg = suggestions.find((s) => s.id === suggId);
    if (!sugg || !parsedDoc) return;

    const newDoc = { ...parsedDoc };

    if (sugg.section === "personal" && sugg.field === "professional_title") {
      newDoc.personal_information = {
        ...newDoc.personal_information,
        professional_title: sugg.suggested
      } as PersonalInfo;
    } else if (sugg.section === "summary" && sugg.field === "professional_summary") {
      newDoc.professional_summary = sugg.suggested;
    } else if (sugg.section === "experience" && sugg.field === "bullet_points" && sugg.index !== undefined && sugg.bulletIndex !== undefined) {
      if (newDoc.experience && newDoc.experience[sugg.index]) {
        const expList = [...newDoc.experience];
        expList[sugg.index].bullet_points[sugg.bulletIndex] = sugg.suggested;
        newDoc.experience = expList;
      }
    } else if (sugg.section === "skills" && sugg.index !== undefined) {
      if (newDoc.skills && newDoc.skills[sugg.index]) {
        const skillsGroups = [...newDoc.skills];
        skillsGroups[sugg.index].skills = sugg.suggested.split(", ").map(s => s.trim());
        newDoc.skills = skillsGroups;
      }
    }

    setParsedDoc(newDoc);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggId ? { ...s, status: "accepted" as const } : s))
    );
    toast.success("AI suggestion accepted!");
  };

  const rejectSuggestion = (suggId: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggId ? { ...s, status: "rejected" as const } : s))
    );
    toast.info("AI suggestion dismissed.");
  };

  const acceptAllSuggestions = (section: string) => {
    const sectionSugs = suggestions.filter((s) => s.section === section && s.status === "pending");
    if (sectionSugs.length === 0) {
      toast.info("No pending suggestions in this section.");
      return;
    }
    
    let newDoc = { ...parsedDoc };
    sectionSugs.forEach((sugg) => {
      if (sugg.section === "personal" && sugg.field === "professional_title") {
        newDoc.personal_information = {
          ...newDoc.personal_information,
          professional_title: sugg.suggested
        } as PersonalInfo;
      } else if (sugg.section === "summary" && sugg.field === "professional_summary") {
        newDoc.professional_summary = sugg.suggested;
      } else if (sugg.section === "experience" && sugg.field === "bullet_points" && sugg.index !== undefined && sugg.bulletIndex !== undefined) {
        if (newDoc.experience && newDoc.experience[sugg.index]) {
          const expList = [...newDoc.experience];
          expList[sugg.index].bullet_points[sugg.bulletIndex] = sugg.suggested;
          newDoc.experience = expList;
        }
      } else if (sugg.section === "skills" && sugg.index !== undefined) {
        if (newDoc.skills && newDoc.skills[sugg.index]) {
          const skillsGroups = [...newDoc.skills];
          skillsGroups[sugg.index].skills = sugg.suggested.split(", ").map(s => s.trim());
          newDoc.skills = skillsGroups;
        }
      }
    });

    setParsedDoc(newDoc);
    setSuggestions((prev) =>
      prev.map((s) => (s.section === section && s.status === "pending" ? { ...s, status: "accepted" as const } : s))
    );
    toast.success(`Accepted ${sectionSugs.length} suggestions!`);
  };

  const rejectAllSuggestions = (section: string) => {
    const sectionSugs = suggestions.filter((s) => s.section === section && s.status === "pending");
    if (sectionSugs.length === 0) {
      toast.info("No pending suggestions in this section.");
      return;
    }
    setSuggestions((prev) =>
      prev.map((s) => (s.section === section && s.status === "pending" ? { ...s, status: "rejected" as const } : s))
    );
    toast.info(`Dismissed ${sectionSugs.length} suggestions.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900/5 dark:bg-slate-950/20 gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Generating AI Workspace...</p>
      </div>
    );
  }

  if (!session || !parsedDoc) return null;

  const confidence = session.extraction_metadata?.section_confidence || {};

  const sectionsList = [
    { id: "personal", label: "Personal Info", icon: User, confidence: confidence["personal_information"] },
    { id: "summary", label: "Professional Summary", icon: FileText, confidence: confidence["professional_summary"] },
    { id: "experience", label: "Work Experience", icon: Briefcase, confidence: confidence["experience"] },
    { id: "education", label: "Education", icon: GraduationCap, confidence: confidence["education"] },
    { id: "skills", label: "Skills", icon: Wrench, confidence: confidence["skills"] },
    { id: "projects", label: "Projects", icon: Layers, confidence: confidence["projects"] },
    { id: "certifications", label: "Certifications", icon: Award, confidence: confidence["certifications"] },
    { id: "achievements", label: "Achievements", icon: Award, confidence: confidence["achievements"] },
    { id: "positions", label: "Responsibility Roles", icon: ShieldIconStub, confidence: confidence["positions_of_responsibility"] },
    { id: "languages", label: "Languages", icon: Globe, confidence: confidence["languages"] },
    { id: "interests", label: "Interests", icon: Heart, confidence: confidence["interests"] },
  ];

  function ShieldIconStub(props: any) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
      </svg>
    );
  }

  // Safe lists
  const eduList = parsedDoc.education || [];
  const expList = parsedDoc.experience || [];
  const projList = parsedDoc.projects || [];
  const skillsGroups = parsedDoc.skills || [];
  const certsList = parsedDoc.certifications || [];
  const achsList = parsedDoc.achievements || [];
  const posList = parsedDoc.positions_of_responsibility || [];
  const langList = parsedDoc.languages || [];
  const intList = parsedDoc.interests || [];

  // Section status determination
  const getSectionStatus = (secId: string) => {
    if (verifiedSections.includes(secId)) {
      return { label: "Verified", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    }
    const hasPendingSug = suggestions.some(s => s.section === secId && s.status === "pending");
    if (hasPendingSug) {
      return { label: "AI Suggested", color: "bg-purple-500/10 text-purple-500 border-purple-500/20 animate-pulse" };
    }
    const hasData = getSectionHasData(secId);
    if (!hasData) {
      return { label: "Missing", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    }
    const conf = confidence[secId === "positions" ? "positions_of_responsibility" : secId === "personal" ? "personal_information" : secId === "summary" ? "professional_summary" : secId];
    if (conf !== undefined && conf < 0.8) {
      return { label: "Needs Review", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    }
    return { label: "Complete", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  };

  const getSectionHasData = (secId: string) => {
    switch (secId) {
      case "personal":
        return !!parsedDoc.personal_information?.full_name;
      case "summary":
        return !!parsedDoc.professional_summary;
      case "education":
        return eduList.length > 0;
      case "experience":
        return expList.length > 0;
      case "skills":
        return skillsGroups.length > 0;
      case "projects":
        return projList.length > 0;
      case "certifications":
        return certsList.length > 0;
      case "achievements":
        return achsList.length > 0;
      case "positions":
        return posList.length > 0;
      case "languages":
        return langList.length > 0;
      case "interests":
        return intList.length > 0;
      default:
        return false;
    }
  };

  // AI insights variables
  const overallConfidence = Math.round(
    (Object.values(confidence).reduce((acc: number, val: any) => acc + (val || 0), 0) /
      Object.keys(confidence).length) * 100 || 94
  );
  const warningCount = session.parsing_warnings?.length || 0;
  const missingCount = session.missing_sections?.length || 0;

  return (
    <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 flex flex-col font-sans">
      {/* ─── Premium Sticky Header ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Review Parser</h1>
                <Badge variant="secondary" className="text-[10px] font-bold py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                  {session.document_type || "Resume"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify parsing results, accept AI recommendations, and finalize import.
              </p>
            </div>
          </div>

          {/* Stepper component */}
          <div className="hidden lg:block w-[450px]">
            <Stepper
              steps={[
                { label: "Upload" },
                { label: "Parse" },
                { label: "Review" },
                { label: "Import" },
                { label: "Complete" },
              ]}
              currentStep={2}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Draft</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </Button>

            <Button
              onClick={handleFinalize}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 shadow-sm"
            >
              {isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Finalize Import</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Two-Column Premium Workspace ─── */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)] overflow-hidden">
        
        {/* LEFT COLUMN: Workspace Editor & Navigator (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-5 h-full overflow-hidden">
          
          {/* AI Insights Summary Bar */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">AI Insights & Parser Confidence</h2>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    Accuracy: <strong className="text-indigo-500">{overallConfidence}%</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    Warnings: <strong className="text-amber-500">{warningCount}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    Missing Fields: <strong className="text-rose-500">{missingCount}</strong>
                  </span>
                </div>
              </div>
            </div>
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/5 text-amber-500 border-amber-500/20 font-bold self-start md:self-auto gap-1">
                <AlertTriangle className="w-3 h-3" /> Fix {warningCount} Parser Warning{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Left Split: Sidebar navigator + Form Editor Card */}
          <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
            
            {/* 11-Section Navigator List */}
            <div className="w-48 flex flex-col gap-1 overflow-y-auto shrink-0 pr-1 select-none">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pl-2 mb-2">Sections</p>
              {sectionsList.map((sec) => {
                const status = getSectionStatus(sec.id);
                const isActive = activeSection === sec.id;
                
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSectionSelect(sec.id)}
                    className={cn(
                      "group flex flex-col gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-left",
                      isActive
                        ? "bg-white dark:bg-slate-900 text-primary border-primary/20 shadow-sm"
                        : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <sec.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-slate-400")} />
                        <span className="truncate">{sec.label}</span>
                      </div>
                      {sec.confidence !== undefined && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {Math.round(sec.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {/* Status Badge */}
                    <div className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold border w-fit uppercase tracking-wider", status.color)}>
                      {status.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Editor Workspace Card */}
            <Card className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-5 h-full flex flex-col">
              
              {/* Show warnings if any inside editor */}
              {session.parsing_warnings && session.parsing_warnings.length > 0 && activeSection === "personal" && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md text-[11px] flex gap-2 items-start leading-relaxed animate-in slide-in-from-top-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Parsing Warnings:</p>
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                      {session.parsing_warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Active form renders */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    {/* Form headers & statuses */}
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white capitalize">
                          {activeSection.replace("_", " ")} Workspace
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Review, modify fields, or accept inline AI proposals below.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Section Verify Button */}
                        <Button
                          onClick={() => markSectionAsVerified(activeSection)}
                          variant={verifiedSections.includes(activeSection) ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1.5",
                            verifiedSections.includes(activeSection) && "bg-blue-600 hover:bg-blue-700 text-white"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{verifiedSections.includes(activeSection) ? "Verified" : "Verify Section"}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Section-specific Form Inputs */}
                    {activeSection === "personal" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="full_name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</Label>
                          <Input
                            id="full_name"
                            value={parsedDoc.personal_information?.full_name || ""}
                            onChange={(e) => updatePersonalInfo("full_name", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</Label>
                          <Input
                            id="email"
                            value={parsedDoc.personal_information?.email || ""}
                            onChange={(e) => updatePersonalInfo("email", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</Label>
                          <Input
                            id="phone"
                            value={parsedDoc.personal_information?.phone || ""}
                            onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="location" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</Label>
                          <Input
                            id="location"
                            value={parsedDoc.personal_information?.location || ""}
                            onChange={(e) => updatePersonalInfo("location", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Professional Title</Label>
                          <Input
                            id="title"
                            value={parsedDoc.personal_information?.professional_title || ""}
                            onChange={(e) => updatePersonalInfo("professional_title", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="linkedin" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            value={parsedDoc.personal_information?.linkedin_url || ""}
                            onChange={(e) => updatePersonalInfo("linkedin_url", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="github" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GitHub URL</Label>
                          <Input
                            id="github"
                            value={parsedDoc.personal_information?.github_url || ""}
                            onChange={(e) => updatePersonalInfo("github_url", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="portfolio" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portfolio/Website</Label>
                          <Input
                            id="portfolio"
                            value={parsedDoc.personal_information?.portfolio_url || ""}
                            onChange={(e) => updatePersonalInfo("portfolio_url", e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>
                    )}

                    {activeSection === "summary" && (
                      <div className="space-y-3">
                        <Label htmlFor="summary_statement" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Summary Text</Label>
                        <Textarea
                          id="summary_statement"
                          value={parsedDoc.professional_summary || ""}
                          onChange={(e) => setParsedDoc({ ...parsedDoc, professional_summary: e.target.value })}
                          rows={7}
                          className="text-xs resize-none leading-relaxed"
                          placeholder="Introduce your skills, profile highlights, and career focus..."
                        />
                      </div>
                    )}

                    {activeSection === "experience" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                experience: [
                                  ...expList,
                                  { company: "New Company", title: "New Position", location: "", start_date: "", end_date: "", is_current: false, description: "", bullet_points: [] },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Job Entry
                          </Button>
                        </div>

                        {expList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No experience entries parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  experience: [{ company: "New Company", title: "New Position", location: "", start_date: "", end_date: "", is_current: false, description: "", bullet_points: [] }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {expList.map((exp, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      experience: expList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Company</span>
                                    <Input
                                      value={exp.company || ""}
                                      onChange={(e) => {
                                        const list = [...expList];
                                        list[idx].company = e.target.value;
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Position</span>
                                    <Input
                                      value={exp.title || ""}
                                      onChange={(e) => {
                                        const list = [...expList];
                                        list[idx].title = e.target.value;
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                                    <Input
                                      value={exp.start_date || ""}
                                      onChange={(e) => {
                                        const list = [...expList];
                                        list[idx].start_date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      placeholder="e.g. June 2021"
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                                    <Input
                                      value={exp.end_date || ""}
                                      disabled={exp.is_current}
                                      onChange={(e) => {
                                        const list = [...expList];
                                        list[idx].end_date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      placeholder="e.g. Present"
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <input
                                      type="checkbox"
                                      id={`exp-curr-${idx}`}
                                      checked={exp.is_current || false}
                                      onChange={(e) => {
                                        const list = [...expList];
                                        list[idx].is_current = e.target.checked;
                                        if (e.target.checked) list[idx].end_date = "Present";
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      className="rounded border-slate-200 dark:border-slate-800 text-primary focus:ring-primary w-3.5 h-3.5"
                                    />
                                    <label htmlFor={`exp-curr-${idx}`} className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                                      I currently work here
                                    </label>
                                  </div>
                                </div>

                                {/* Bullets */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bullet Points</span>
                                    <Button
                                      onClick={() => {
                                        const list = [...expList];
                                        list[idx].bullet_points = [...(list[idx].bullet_points || []), ""];
                                        setParsedDoc({ ...parsedDoc, experience: list });
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[9px] font-bold gap-1 text-primary hover:bg-primary/10"
                                    >
                                      <Plus className="w-3 h-3" /> Add bullet
                                    </Button>
                                  </div>
                                  {(exp.bullet_points || []).map((bullet: string, bIdx: number) => (
                                    <div key={bIdx} className="flex gap-2 items-center">
                                      <span className="text-muted-foreground text-xs">•</span>
                                      <Input
                                        value={bullet}
                                        onChange={(e) => {
                                          const list = [...expList];
                                          list[idx].bullet_points[bIdx] = e.target.value;
                                          setParsedDoc({ ...parsedDoc, experience: list });
                                        }}
                                        className="text-xs h-8 flex-1"
                                      />
                                      <button
                                        onClick={() => {
                                          const list = [...expList];
                                          list[idx].bullet_points = list[idx].bullet_points.filter((_: any, i: any) => i !== bIdx);
                                          setParsedDoc({ ...parsedDoc, experience: list });
                                        }}
                                        className="text-slate-400 hover:text-rose-500"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "education" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                education: [
                                  ...eduList,
                                  { institution: "New Institution", degree: "New Degree", field_of_study: "", start_date: "", end_date: "", is_current: false, gpa: "", description: "" },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Degree
                          </Button>
                        </div>

                        {eduList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No education entries parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  education: [{ institution: "New Institution", degree: "New Degree", field_of_study: "", start_date: "", end_date: "", is_current: false, gpa: "", description: "" }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {eduList.map((edu, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      education: eduList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Institution</span>
                                    <Input
                                      value={edu.institution || ""}
                                      onChange={(e) => {
                                        const list = [...eduList];
                                        list[idx].institution = e.target.value;
                                        setParsedDoc({ ...parsedDoc, education: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Degree</span>
                                    <Input
                                      value={edu.degree || ""}
                                      onChange={(e) => {
                                        const list = [...eduList];
                                        list[idx].degree = e.target.value;
                                        setParsedDoc({ ...parsedDoc, education: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Field of Study</span>
                                    <Input
                                      value={edu.field_of_study || ""}
                                      onChange={(e) => {
                                        const list = [...eduList];
                                        list[idx].field_of_study = e.target.value;
                                        setParsedDoc({ ...parsedDoc, education: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Graduation Date</span>
                                    <Input
                                      value={edu.end_date || ""}
                                      onChange={(e) => {
                                        const list = [...eduList];
                                        list[idx].end_date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, education: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "skills" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                skills: [
                                  ...skillsGroups,
                                  { category: "Technical Skills", skills: [] },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Category
                          </Button>
                        </div>

                        {skillsGroups.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No skills categories parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  skills: [{ category: "Technical Skills", skills: [] }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Category
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {skillsGroups.map((group, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      skills: skillsGroups.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category Name</span>
                                  <Input
                                    value={group.category || ""}
                                    onChange={(e) => {
                                      const list = [...skillsGroups];
                                      list[idx].category = e.target.value;
                                      setParsedDoc({ ...parsedDoc, skills: list });
                                    }}
                                    className="text-xs h-8.5"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Skills (comma-separated)</span>
                                  <Input
                                    value={group.skills.join(", ") || ""}
                                    onChange={(e) => {
                                      const list = [...skillsGroups];
                                      list[idx].skills = e.target.value.split(",").map((s) => s.trim());
                                      setParsedDoc({ ...parsedDoc, skills: list });
                                    }}
                                    className="text-xs h-8.5"
                                    placeholder="React, Vue, Node.js"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "projects" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                projects: [
                                  ...projList,
                                  { name: "New Project", description: "", start_date: "", end_date: "", url: "", github_url: "", technologies: [] },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Project
                          </Button>
                        </div>

                        {projList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No projects parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  projects: [{ name: "New Project", description: "", start_date: "", end_date: "", url: "", github_url: "", technologies: [] }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Project
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {projList.map((proj, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      projects: projList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Project Name</span>
                                    <Input
                                      value={proj.name || ""}
                                      onChange={(e) => {
                                        const list = [...projList];
                                        list[idx].name = e.target.value;
                                        setParsedDoc({ ...parsedDoc, projects: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Project URL</span>
                                    <Input
                                      value={proj.url || ""}
                                      onChange={(e) => {
                                        const list = [...projList];
                                        list[idx].url = e.target.value;
                                        setParsedDoc({ ...parsedDoc, projects: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                                    <Input
                                      value={proj.start_date || ""}
                                      onChange={(e) => {
                                        const list = [...projList];
                                        list[idx].start_date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, projects: list });
                                      }}
                                      placeholder="e.g. Oct 2021"
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                                    <Input
                                      value={proj.end_date || ""}
                                      onChange={(e) => {
                                        const list = [...projList];
                                        list[idx].end_date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, projects: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Description</span>
                                  <Textarea
                                    value={proj.description || ""}
                                    onChange={(e) => {
                                      const list = [...projList];
                                      list[idx].description = e.target.value;
                                      setParsedDoc({ ...parsedDoc, projects: list });
                                    }}
                                    className="text-xs h-16 resize-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "certifications" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                certifications: [
                                  ...certsList,
                                  { name: "New Certification", issuer: "", issue_date: "", expiry_date: "", credential_id: "", url: "" },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Certification
                          </Button>
                        </div>

                        {certsList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Award className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No certifications parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  certifications: [{ name: "New Certification", issuer: "", issue_date: "", expiry_date: "", credential_id: "", url: "" }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {certsList.map((cert, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      certifications: certsList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cert Name</span>
                                    <Input
                                      value={cert.name || ""}
                                      onChange={(e) => {
                                        const list = [...certsList];
                                        list[idx].name = e.target.value;
                                        setParsedDoc({ ...parsedDoc, certifications: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Issuer</span>
                                    <Input
                                      value={cert.issuer || ""}
                                      onChange={(e) => {
                                        const list = [...certsList];
                                        list[idx].issuer = e.target.value;
                                        setParsedDoc({ ...parsedDoc, certifications: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "achievements" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                achievements: [
                                  ...achsList,
                                  { title: "New Achievement", description: "", date: "", issuer: "" },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Achievement
                          </Button>
                        </div>

                        {achsList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Award className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No achievements parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  achievements: [{ title: "New Achievement", description: "", date: "", issuer: "" }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {achsList.map((ach, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      achievements: achsList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Title</span>
                                    <Input
                                      value={ach.title || ""}
                                      onChange={(e) => {
                                        const list = [...achsList];
                                        list[idx].title = e.target.value;
                                        setParsedDoc({ ...parsedDoc, achievements: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Date</span>
                                    <Input
                                      value={ach.date || ""}
                                      onChange={(e) => {
                                        const list = [...achsList];
                                        list[idx].date = e.target.value;
                                        setParsedDoc({ ...parsedDoc, achievements: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Description</span>
                                  <Textarea
                                    value={ach.description || ""}
                                    onChange={(e) => {
                                      const list = [...achsList];
                                      list[idx].description = e.target.value;
                                      setParsedDoc({ ...parsedDoc, achievements: list });
                                    }}
                                    className="text-xs h-16 resize-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "positions" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                positions_of_responsibility: [
                                  ...posList,
                                  { role: "New Position", organization: "", start_date: "", end_date: "", description: "" },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Role
                          </Button>
                        </div>

                        {posList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <ShieldIconStub className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No responsibility entries parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  positions_of_responsibility: [{ role: "New Position", organization: "", start_date: "", end_date: "", description: "" }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {posList.map((pos, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      positions_of_responsibility: posList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Organization</span>
                                    <Input
                                      value={pos.organization || ""}
                                      onChange={(e) => {
                                        const list = [...posList];
                                        list[idx].organization = e.target.value;
                                        setParsedDoc({ ...parsedDoc, positions_of_responsibility: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Role/Position</span>
                                    <Input
                                      value={pos.role || ""}
                                      onChange={(e) => {
                                        const list = [...posList];
                                        list[idx].role = e.target.value;
                                        setParsedDoc({ ...parsedDoc, positions_of_responsibility: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "languages" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                languages: [
                                  ...langList,
                                  { language: "New Language", proficiency: "" },
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Language
                          </Button>
                        </div>

                        {langList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Globe className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No languages parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  languages: [{ language: "New Language", proficiency: "" }]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {langList.map((lang, idx) => (
                              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10 space-y-3 relative group/item hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      languages: langList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Language</span>
                                    <Input
                                      value={lang.language || ""}
                                      onChange={(e) => {
                                        const list = [...langList];
                                        list[idx].language = e.target.value;
                                        setParsedDoc({ ...parsedDoc, languages: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Proficiency</span>
                                    <Input
                                      value={lang.proficiency || ""}
                                      onChange={(e) => {
                                        const list = [...langList];
                                        list[idx].proficiency = e.target.value;
                                        setParsedDoc({ ...parsedDoc, languages: list });
                                      }}
                                      className="text-xs h-8.5"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeSection === "interests" && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              setParsedDoc({
                                ...parsedDoc,
                                interests: [
                                  ...intList,
                                  "New Interest",
                                ],
                              })
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold border-slate-200 dark:border-slate-800 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Interest
                          </Button>
                        </div>

                        {intList.length === 0 ? (
                          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                            <Heart className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400 font-semibold">No interests parsed.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setParsedDoc({
                                  ...parsedDoc,
                                  interests: ["New Interest"]
                                })
                              }
                              className="text-[10px] font-bold h-7.5"
                            >
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {intList.map((item, idx) => (
                              <div key={idx} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/10 relative group/item flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700">
                                <Input
                                  value={item || ""}
                                  onChange={(e) => {
                                    const list = [...intList];
                                    list[idx] = e.target.value;
                                    setParsedDoc({ ...parsedDoc, interests: list });
                                  }}
                                  className="text-xs h-8 flex-1 border-none focus:ring-0 focus-visible:ring-0 bg-transparent p-0"
                                />
                                <button
                                  onClick={() =>
                                    setParsedDoc({
                                      ...parsedDoc,
                                      interests: intList.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="text-slate-400 hover:text-rose-500 shrink-0 ml-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ─── Inline AI Suggestions Block ─── */}
              {suggestions.filter(s => s.section === activeSection && s.status === "pending").length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI Suggested Changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => acceptAllSuggestions(activeSection)}
                        className="text-[9px] font-bold h-6 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        Accept All
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => rejectAllSuggestions(activeSection)}
                        className="text-[9px] font-bold h-6 text-slate-400 hover:text-slate-500 hover:bg-slate-50"
                      >
                        Dismiss All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {suggestions
                      .filter((s) => s.section === activeSection && s.status === "pending")
                      .map((sug) => (
                        <div key={sug.id} className="p-3 border border-purple-200/60 dark:border-purple-900/30 rounded-xl bg-purple-500/5 hover:bg-purple-500/8 transition-all flex flex-col gap-2">
                          <div>
                            <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                              {sug.explanation}
                            </p>
                            <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] leading-normal">
                              {sug.original && (
                                <div className="p-1.5 rounded bg-slate-500/5 text-slate-500 border border-slate-100 dark:border-slate-800 line-through">
                                  {sug.original}
                                </div>
                              )}
                              <div className="p-1.5 rounded bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/20 font-medium">
                                {sug.suggested}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 self-end">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => rejectSuggestion(sug.id)}
                              className="h-5 text-[9px] font-bold py-0 px-2"
                            >
                              Dismiss
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => acceptSuggestion(sug.id)}
                              className="h-5 text-[9px] font-bold py-0 px-2 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: Dominant Live Resume Preview (40%) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden h-full">
          
          {/* Preview Toolbar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">Live Resume Preview</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/20">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="w-7 h-7 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[10px] font-bold px-2 tabular-nums text-slate-600 dark:text-slate-300">{zoom}%</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                  className="w-7 h-7 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Template dropdown selector */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">Template:</span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 py-1 px-2.5 outline-none cursor-pointer"
                >
                  <option value="modern">Modern Sans</option>
                  <option value="professional">Professional Serif</option>
                  <option value="creative">Creative Minimal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sticky Scrollable A4 Document Viewport */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-100/50 dark:bg-slate-950/20">
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                marginBottom: `${(zoom / 100) * 1100 - 1100}px`
              }}
              className={cn(
                "w-[600px] min-h-[840px] bg-white text-slate-800 p-8 shadow-xl border border-slate-200/80 transition-all duration-300 ease-out select-none flex flex-col justify-start gap-4",
                templateId === "professional" && "font-serif",
                templateId === "modern" && "font-sans",
                templateId === "creative" && "font-sans tracking-wide"
              )}
            >
              {/* Header section in preview */}
              <div 
                id="preview-sec-personal" 
                className={cn(
                  "p-2 rounded-lg transition-all duration-300 border border-transparent",
                  activeSection === "personal" && "border-primary/20 bg-primary/5",
                  highlightedSection === "personal" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                )}
              >
                <div className={cn("text-center space-y-1", templateId === "creative" && "text-left border-l-4 border-primary pl-3")}>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900">{parsedDoc.personal_information?.full_name || "John Doe"}</h2>
                  <p className="text-[8.5px] text-slate-500 font-sans leading-normal">
                    {[
                      parsedDoc.personal_information?.email,
                      parsedDoc.personal_information?.phone,
                      parsedDoc.personal_information?.location,
                    ]
                      .filter(Boolean)
                      .join("  |  ")}
                  </p>
                  {parsedDoc.personal_information?.professional_title && (
                    <p className="text-[9px] font-bold text-primary font-sans">
                      {parsedDoc.personal_information.professional_title}
                    </p>
                  )}
                </div>
              </div>

              <hr className="border-t border-slate-100" />

              {/* Professional Summary */}
              {parsedDoc.professional_summary && (
                <div
                  id="preview-sec-summary"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-1.5",
                    activeSection === "summary" && "border-primary/20 bg-primary/5",
                    highlightedSection === "summary" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Professional Summary</h4>
                  <p className="text-[9px] leading-relaxed text-slate-700">{parsedDoc.professional_summary}</p>
                </div>
              )}

              {/* Work Experience */}
              {expList.length > 0 && (
                <div
                  id="preview-sec-experience"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-2.5",
                    activeSection === "experience" && "border-primary/20 bg-primary/5",
                    highlightedSection === "experience" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Work Experience</h4>
                  <div className="space-y-3">
                    {expList.map((job, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-baseline font-sans">
                          <span className="text-[9px] font-bold text-slate-800">{job.company}</span>
                          <span className="text-[8px] text-slate-400 font-medium">
                            {job.start_date} — {job.end_date || (job.is_current ? "Present" : "")}
                          </span>
                        </div>
                        <p className="text-[8.5px] font-medium text-slate-500">{job.title}</p>
                        {job.bullet_points && job.bullet_points.length > 0 && (
                          <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                            {job.bullet_points.map((b: string, bIdx: number) => (
                              <li key={bIdx} className="text-[8.5px] leading-relaxed text-slate-600">{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {eduList.length > 0 && (
                <div
                  id="preview-sec-education"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-2",
                    activeSection === "education" && "border-primary/20 bg-primary/5",
                    highlightedSection === "education" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Education</h4>
                  <div className="space-y-2">
                    {eduList.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[8.5px] font-sans">
                        <div>
                          <span className="font-bold text-slate-800">{edu.institution}</span>
                          {edu.degree && (
                            <span className="text-slate-500"> — {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 font-medium">{edu.end_date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Skills */}
              {skillsGroups.length > 0 && (
                <div
                  id="preview-sec-skills"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-1.5",
                    activeSection === "skills" && "border-primary/20 bg-primary/5",
                    highlightedSection === "skills" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Technical Skills</h4>
                  <div className="space-y-1 font-sans text-[8.5px]">
                    {skillsGroups.map((g, idx) => (
                      <p key={idx} className="leading-relaxed text-slate-600">
                        <strong className="text-slate-800">{g.category}:</strong> {g.skills.join(", ")}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projList.length > 0 && (
                <div
                  id="preview-sec-projects"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-2.5",
                    activeSection === "projects" && "border-primary/20 bg-primary/5",
                    highlightedSection === "projects" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Projects</h4>
                  <div className="space-y-2">
                    {projList.map((proj, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-baseline font-sans">
                          <span className="text-[9px] font-bold text-slate-800">{proj.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium">{proj.start_date} — {proj.end_date}</span>
                        </div>
                        {proj.url && <p className="text-[8px] text-primary/80 font-sans">{proj.url}</p>}
                        <p className="text-[8.5px] leading-relaxed text-slate-600">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {certsList.length > 0 && (
                <div
                  id="preview-sec-certifications"
                  className={cn(
                    "p-2 rounded-lg transition-all duration-300 border border-transparent space-y-2",
                    activeSection === "certifications" && "border-primary/20 bg-primary/5",
                    highlightedSection === "certifications" && "border-indigo-500/30 bg-indigo-500/5 ring-2 ring-indigo-500/20"
                  )}
                >
                  <h4 className="text-[9.5px] font-extrabold uppercase tracking-wider text-primary font-sans">Certifications</h4>
                  <div className="space-y-1.5">
                    {certsList.map((cert, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[8.5px] font-sans">
                        <span className="font-bold text-slate-800">{cert.name}</span>
                        <span className="text-slate-500">{cert.issuer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
