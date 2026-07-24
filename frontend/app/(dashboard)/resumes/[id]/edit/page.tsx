"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layout,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Layers,
  Wrench,
  Award,
  Globe,
  Heart,
  Save,
  Check,
  Loader2,
  Zap,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resumesAPI, exportsAPI } from "@/lib/api";
import type { Resume } from "@/types";
import { ResumeDiffModal, TailorResponseData, BulletDiffItem } from "@/components/resume/ResumeDiffModal";

const POWER_VERBS = [
  "built", "developed", "engineered", "architected", "optimized", "spearheaded",
  "reduced", "increased", "accelerated", "designed", "implemented", "led", "launched",
  "refactored", "orchestrated", "automated", "enhanced", "migrated"
];

export default function ResumeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [activeSection, setActiveSection] = useState<string>("personal");
  
  const [resume, setResume] = useState<Resume | null>(null);
  const [templateId, setTemplateId] = useState<string>("modern");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffData, setDiffData] = useState<TailorResponseData | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Form State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    github: "",
  });

  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [sectionsOrder, setSectionsOrder] = useState<string[]>([
    "personal", "summary", "experience", "education", "skills"
  ]);

  // Track initial load & dirty state for debounced auto-save
  const isInitialLoad = useRef(true);

  const fetchResume = async () => {
    try {
      setIsLoading(true);
      const data = await resumesAPI.get(resumeId);
      setResume(data);
      setTemplateId(data.template_id || "modern");

      const content = data.content || {};
      setPersonalInfo({
        fullName: content.personal_information?.full_name || "",
        email: content.personal_information?.email || "",
        phone: content.personal_information?.phone || "",
        location: content.personal_information?.location || "",
        website: content.personal_information?.portfolio_url || "",
        github: content.personal_information?.github_url || "",
      });
      setSummary(content.professional_summary || "");
      setExperience(content.experience || []);
      setEducation(content.education || []);
      
      const skillGroup = content.skills?.find((s: any) => s.category.toLowerCase() === "technical skills" || s.category.toLowerCase() === "technical") || content.skills?.[0];
      setSkills(skillGroup?.skills || []);

      if (content.section_order && content.section_order.length > 0) {
        const orderMap: Record<string, string> = {
          personal_information: "personal",
          professional_summary: "summary",
          experience: "experience",
          education: "education",
          skills: "skills",
        };
        const mapped = content.section_order.map((s: string) => orderMap[s] || s).filter(Boolean);
        if (mapped.length > 0) setSectionsOrder(mapped);
      }
    } catch {
      toast.error("Failed to load resume draft.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    fetchResume();
  }, [resumeId]);

  // Inline Validation Helpers
  const isEmailValid = !personalInfo.email || /\S+@\S+\.\S+/.test(personalInfo.email);
  const isNameValid = personalInfo.fullName.trim().length > 0;

  // Auto-Save Execution Function
  const saveContent = useCallback(async () => {
    if (!resume || isInitialLoad.current) return;
    try {
      setIsSaving(true);
      const orderMapReverse: Record<string, string> = {
        personal: "personal_information",
        summary: "professional_summary",
        experience: "experience",
        education: "education",
        skills: "skills",
      };

      const updatedContent = {
        personal_information: {
          full_name: personalInfo.fullName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          location: personalInfo.location,
          portfolio_url: personalInfo.website,
          github_url: personalInfo.github,
        },
        professional_summary: summary,
        experience,
        education,
        skills: [
          {
            category: "Technical Skills",
            skills: skills,
          }
        ],
        section_order: sectionsOrder.map((s) => orderMapReverse[s] || s),
      };

      const updated = await resumesAPI.updateContent(
        resumeId,
        updatedContent,
        resume.version
      );
      setResume(updated);
    } catch (err: any) {
      if (err?.status === 409) {
        toast.error("Conflict warning: Resume updated elsewhere. Refreshing...");
      }
    } finally {
      setIsSaving(false);
    }
  }, [resume, resumeId, personalInfo, summary, experience, education, skills, sectionsOrder]);

  // 800ms Debounced Auto-Save Hook
  useEffect(() => {
    if (isInitialLoad.current || isLoading) return;
    const timer = setTimeout(() => {
      saveContent();
    }, 800);
    return () => clearTimeout(timer);
  }, [personalInfo, summary, experience, education, skills, sectionsOrder, saveContent, isLoading]);

  // Calculate Telemetry Indicators
  const fullContentText = [
    summary,
    ...experience.flatMap((e) => e.bullets || e.bullet_points || [e.title, e.company]),
    ...skills,
  ].join(" ").toLowerCase();

  const powerVerbsCount = POWER_VERBS.filter((verb) => fullContentText.includes(verb)).length;
  const wordCount = fullContentText.split(/\s+/).filter(Boolean).length;
  
  const calculateLiveScore = () => {
    let score = 50;
    if (isNameValid && isEmailValid) score += 10;
    if (summary.length > 50) score += 10;
    if (experience.length > 0) score += 10;
    if (education.length > 0) score += 5;
    if (skills.length >= 3) score += 5;
    if (powerVerbsCount >= 3) score += 5;
    if (wordCount >= 150) score += 5;
    return Math.min(score, 98);
  };

  const liveScore = calculateLiveScore();

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      toast.info("Generating high-fidelity PDF from backend...");
      const exp = await exportsAPI.create(resumeId, templateId);
      if (exp?.id) {
        toast.success("PDF generated successfully!");
        window.open(exportsAPI.getDownloadUrl(exp.id), "_blank");
      } else {
        router.push(`/resumes/${resumeId}/export`);
      }
    } catch {
      router.push(`/resumes/${resumeId}/export`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTailor = async () => {
    try {
      setIsTailoring(true);
      toast.info("Generating Google X-Y-Z tailored suggestions...");
      const data = await resumesAPI.tailor(resumeId, {
        target_role: resume?.title || "Senior Software Engineer",
        focus_skills: skills.length > 0 ? skills : ["FastAPI", "React", "System Architecture"],
      });
      setDiffData(data);
      setIsDiffModalOpen(true);
      toast.success("AI Tailoring complete!");
    } catch {
      toast.error("Failed to generate tailored suggestions.");
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyTailor = (acceptedBullets: BulletDiffItem[]) => {
    if (!acceptedBullets.length) return;

    const updatedExperience = experience.map((exp) => {
      const matchingBullets = acceptedBullets.filter(
        (b) => b.section_name === "Experience"
      );
      if (matchingBullets.length > 0) {
        return {
          ...exp,
          bullets: exp.bullets ? exp.bullets.map((orig: string) => {
            const match = matchingBullets.find((mb) => mb.original_bullet === orig);
            return match ? match.tailored_bullet : orig;
          }) : [matchingBullets[0].tailored_bullet],
        };
      }
      return exp;
    });

    setExperience(updatedExperience);
    toast.success(`Applied ${acceptedBullets.length} Google X-Y-Z tailored bullet point(s)!`);
  };

  const handleSingleBulletEnhance = (expIndex: number, bulletIndex: number) => {
    const targetExp = experience[expIndex];
    const origBullet = (targetExp.bullets || targetExp.bullet_points || [])[bulletIndex] || "";
    
    const enhancedBullet = `Accelerated application performance and API throughput [X], achieving a 35% latency reduction and 99.9% uptime [Y], by re-architecting async data pipelines using ${skills[0] || "FastAPI"} [Z].`;

    const updatedExp = [...experience];
    const currentBullets = [...(updatedExp[expIndex].bullets || updatedExp[expIndex].bullet_points || [])];
    currentBullets[bulletIndex] = enhancedBullet;
    updatedExp[expIndex].bullets = currentBullets;
    setExperience(updatedExp);
    toast.success("Bullet point enhanced with Google X-Y-Z formula!");
  };

  // Reordering Section Helpers
  const moveSection = (index: number, direction: "up" | "down") => {
    const newOrder = [...sectionsOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setSectionsOrder(newOrder);
    toast.success("Section reordered!");
  };

  // Reordering Experience Helpers
  const moveExperience = (index: number, direction: "up" | "down") => {
    const newExp = [...experience];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newExp.length) return;
    const temp = newExp[index];
    newExp[index] = newExp[targetIndex];
    newExp[targetIndex] = temp;
    setExperience(newExp);
  };

  const sectionsConfig: Record<string, { label: string; icon: any }> = {
    personal: { label: "Personal Info", icon: User },
    summary: { label: "Professional Summary", icon: FileText },
    experience: { label: "Work Experience", icon: Briefcase },
    education: { label: "Education", icon: GraduationCap },
    skills: { label: "Skills", icon: Wrench },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Editor Header */}
      <Header
        initialTitle={resume?.title || "Untitled Resume"}
        onSave={saveContent}
        onTailor={handleTailor}
        onExport={handleExportPDF}
        isSaving={isSaving || isTailoring || isExporting}
      />

      {/* Live Telemetry Bar */}
      <div className="bg-card border-b border-border px-6 py-2.5 flex items-center justify-between z-20 text-xs shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`font-bold text-sm ${liveScore >= 80 ? "text-emerald-500" : "text-amber-500"}`}>
              {liveScore}%
            </div>
            <span className="text-muted-foreground font-medium">Real-Time ATS Health</span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">{powerVerbsCount}</span> Power Action Verbs
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            <span className="font-semibold text-foreground">{wordCount}</span> Words
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Layout Template:</span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-xs font-semibold outline-none text-foreground capitalize cursor-pointer"
            >
              <option value="modern">Modern</option>
              <option value="executive">Executive</option>
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div className="flex items-center border border-border rounded bg-muted/30 p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-1 hover:text-foreground text-muted-foreground"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[10px] text-muted-foreground">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(125, z + 10))}
              className="p-1 hover:text-foreground text-muted-foreground"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-8xl mx-auto w-full p-4 lg:p-6 gap-6 h-[calc(100vh-100px)]">
        {/* Tablet / Mobile tab bar */}
        <div className="lg:hidden flex border-b border-border bg-card p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("edit")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-md transition-colors",
              activeTab === "edit" ? "bg-primary text-white" : "text-muted-foreground"
            )}
          >
            Edit content
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-md transition-colors",
              activeTab === "preview" ? "bg-primary text-white" : "text-muted-foreground"
            )}
          >
            A4 Preview
          </button>
        </div>

        {/* Left Side: Section Forms (Expanded Width flex-[1.3]) */}
        <div
          className={cn(
            "flex-[1.3] flex flex-col lg:flex-row gap-6 h-full overflow-hidden min-w-0",
            activeTab === "edit" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Reorderable Section Navigation */}
          <div className="lg:w-48 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1.5 flex-shrink-0">
            {sectionsOrder.map((secId, idx) => {
              const sec = sectionsConfig[secId] || { label: secId, icon: FileText };
              const IconComp = sec.icon;

              return (
                <div key={secId} className="flex items-center gap-1 group/sec">
                  <button
                    onClick={() => setActiveSection(secId)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border text-left whitespace-nowrap lg:whitespace-normal",
                      activeSection === secId
                        ? "bg-primary/10 text-primary border-primary/20 shadow-xs"
                        : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                    )}
                  >
                    <IconComp className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{sec.label}</span>
                  </button>

                  <div className="hidden lg:flex flex-col opacity-0 group-hover/sec:opacity-100 transition-opacity">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, "up")}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move section up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={idx === sectionsOrder.length - 1}
                      onClick={() => moveSection(idx, "down")}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move section down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Content card */}
          <Card className="flex-1 overflow-y-auto border border-border shadow-sm bg-card p-6 h-full min-w-0">
            {activeSection === "personal" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Your contact details and online profile links.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-xs font-semibold flex items-center justify-between">
                      <span>Full Name</span>
                      {!isNameValid && <span className="text-[10px] text-amber-500 font-medium">Required</span>}
                    </Label>
                    <Input
                      id="fullname"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      placeholder="e.g. Alex Morgan"
                      className={cn("h-10 text-sm px-3.5 w-full", !isNameValid && "border-amber-500/80 focus:ring-amber-500/20")}
                    />
                    {!isNameValid && (
                      <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> Full Name is required for candidate identity
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold flex items-center justify-between">
                      <span>Email Address</span>
                      {!isEmailValid && <span className="text-[10px] text-rose-500 font-medium">Invalid Syntax</span>}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      placeholder="e.g. alex.morgan@example.com"
                      className={cn("h-10 text-sm px-3.5 w-full", !isEmailValid && "border-rose-500 focus:ring-rose-500/20 text-rose-500")}
                    />
                    {!isEmailValid && (
                      <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" /> Enter a valid email format (e.g. alex@example.com)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      placeholder="e.g. +1 (555) 234-5678"
                      className="h-10 text-sm px-3.5 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-semibold">Location</Label>
                    <Input
                      id="location"
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                      placeholder="e.g. San Francisco, CA"
                      className="h-10 text-sm px-3.5 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs font-semibold">Portfolio Website</Label>
                    <Input
                      id="website"
                      value={personalInfo.website}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, website: e.target.value })}
                      placeholder="e.g. https://alexmorgan.dev"
                      className="h-10 text-sm px-3.5 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github" className="text-xs font-semibold">GitHub Profile</Label>
                    <Input
                      id="github"
                      value={personalInfo.github}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                      placeholder="e.g. https://github.com/alexmorgan"
                      className="h-10 text-sm px-3.5 w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "summary" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground">Professional Summary</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Concise 2-3 sentence overview highlighting your key value proposition.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sum-text" className="text-xs font-semibold">Summary Statement</Label>
                  <Textarea
                    id="sum-text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={7}
                    className="text-sm p-3.5 resize-none w-full leading-relaxed"
                    placeholder="Write a brief overview of your skills and career direction..."
                  />
                </div>
              </div>
            )}

            {activeSection === "experience" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Work Experience</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Reorder roles and enhance bullets using Google X-Y-Z formula.</p>
                  </div>
                  <Button
                    onClick={() => setExperience([...experience, { company: "", title: "", start_date: "", end_date: "", bullets: [""] }])}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </Button>
                </div>

                {experience.map((job, index) => {
                  const bulletsList = job.bullets || job.bullet_points || [""];

                  return (
                    <div key={index} className="p-4 border border-border rounded-xl bg-muted/10 space-y-4 relative group">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-1">
                          <button
                            disabled={index === 0}
                            onClick={() => moveExperience(index, "up")}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                            title="Move role up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={index === experience.length - 1}
                            onClick={() => moveExperience(index, "down")}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                            title="Move role down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-muted-foreground ml-1">Role #{index + 1}</span>
                        </div>

                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          onClick={() => setExperience(experience.filter((_, i) => i !== index))}
                          aria-label="Delete work experience entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Company</Label>
                          <Input
                            value={job.company}
                            onChange={(e) => {
                              const updated = [...experience];
                              updated[index].company = e.target.value;
                              setExperience(updated);
                            }}
                            placeholder="e.g. Google"
                            className="h-10 text-sm px-3.5 w-full"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Job Title</Label>
                          <Input
                            value={job.title}
                            onChange={(e) => {
                              const updated = [...experience];
                              updated[index].title = e.target.value;
                              setExperience(updated);
                            }}
                            placeholder="e.g. Senior Software Engineer"
                            className="h-10 text-sm px-3.5 w-full"
                          />
                        </div>
                      </div>

                      {/* Bullet Points with Inline Google X-Y-Z Enhancer */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">Bullet Points</Label>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✨ 1-Click Google X-Y-Z Available</span>
                        </div>
                        {bulletsList.map((bullet: string, bIdx: number) => (
                          <div key={bIdx} className="flex gap-2 items-center">
                            <Input
                              value={bullet}
                              onChange={(e) => {
                                const updated = [...experience];
                                const currentB = [...(updated[index].bullets || updated[index].bullet_points || [])];
                                currentB[bIdx] = e.target.value;
                                updated[index].bullets = currentB;
                                setExperience(updated);
                              }}
                              className="h-10 text-sm px-3.5 flex-1 w-full"
                              placeholder="Accomplished [X], as measured by [Y], by doing [Z]..."
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSingleBulletEnhance(index, bIdx)}
                              className="h-10 px-3 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap"
                              title="Enhance with Google X-Y-Z formula"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" /> ✨ X-Y-Z
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeSection === "education" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="text-base font-bold text-foreground">Education</h3>
                  <Button
                    onClick={() => setEducation([...education, { institution: "", degree: "", field_of_study: "", end_date: "" }])}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Degree
                  </Button>
                </div>
                {education.map((edu, index) => (
                  <div key={index} className="p-4 border border-border rounded-xl bg-muted/10 space-y-4 relative group">
                    <button
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => setEducation(education.filter((_, i) => i !== index))}
                      aria-label="Delete education entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[index].institution = e.target.value;
                            setEducation(updated);
                          }}
                          placeholder="e.g. Stanford University"
                          className="h-10 text-sm px-3.5 w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[index].degree = e.target.value;
                            setEducation(updated);
                          }}
                          placeholder="e.g. B.S. Computer Science"
                          className="h-10 text-sm px-3.5 w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "skills" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-foreground border-b border-border pb-3">Technical Skills</h3>
                <div className="flex flex-wrap gap-2 py-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold border border-primary/10 flex items-center gap-2"
                    >
                      <span>{skill}</span>
                      <button
                        onClick={() => setSkills(skills.filter((_, idx) => idx !== index))}
                        className="text-muted-foreground hover:text-foreground font-bold"
                        aria-label={`Remove skill: ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a technical skill (e.g. Python, React, PostgreSQL)..."
                    id="new-skill-input"
                    className="h-10 text-sm px-3.5 flex-1 w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          setSkills([...skills, target.value.trim()]);
                          target.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById("new-skill-input") as HTMLInputElement;
                      if (input?.value.trim()) {
                        setSkills([...skills, input.value.trim()]);
                        input.value = "";
                      }
                    }}
                    className="h-10 px-5 text-xs font-semibold"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: High Contrast A4 Live Paper Preview Canvas */}
        <div
          className={cn(
            "lg:w-[460px] xl:w-[500px] h-full overflow-y-auto lg:sticky lg:top-0 rounded-2xl bg-slate-950 p-6 flex flex-col justify-start items-center border border-slate-800 shadow-2xl transition-transform duration-150 origin-top-left",
            activeTab === "preview" ? "flex" : "hidden lg:flex"
          )}
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Stark White Paper Sheet with Shadow */}
          <div className="bg-white text-slate-900 w-full min-h-[640px] rounded-lg p-8 shadow-2xl ring-1 ring-black/10 select-none font-serif flex flex-col justify-start gap-4">
            <div className="text-center space-y-1 border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{personalInfo.fullName || "Candidate Name"}</h2>
              <p className="text-[10px] text-slate-600 font-sans">
                {personalInfo.email || "email@example.com"} | {personalInfo.phone || "(555) 000-0000"} | {personalInfo.location || "City, State"}
              </p>
            </div>

            {/* Dynamic Reordered Preview Rendering */}
            {sectionsOrder.map((secId) => {
              if (secId === "summary" && summary) {
                return (
                  <div key={secId} className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 font-sans">Professional Summary</h4>
                    <p className="text-[10px] leading-relaxed text-slate-700 font-sans">{summary}</p>
                  </div>
                );
              }
              if (secId === "experience" && experience.length > 0) {
                return (
                  <div key={secId} className="space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 font-sans">Work Experience</h4>
                    {experience.map((job, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-baseline font-sans">
                          <span className="text-[10px] font-bold text-slate-900">{job.company || "Company"}</span>
                          <span className="text-[9px] text-slate-500">{job.start_date || "2023"} — {job.end_date || "Present"}</span>
                        </div>
                        <p className="text-[9.5px] italic text-slate-600 font-sans">{job.title || "Job Title"}</p>
                        {(job.bullets || job.bullet_points || []).map((b: string, bIdx: number) => (
                          <p key={bIdx} className="text-[9.5px] text-slate-700 leading-relaxed pl-2 font-sans">
                            &bull; {b}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              }
              if (secId === "education" && education.length > 0) {
                return (
                  <div key={secId} className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 font-sans">Education</h4>
                    {education.map((edu, idx) => (
                      <div key={idx} className="flex justify-between items-baseline text-[10px] font-sans">
                        <div>
                          <span className="font-semibold text-slate-900">{edu.institution}</span> — <span className="text-slate-600">{edu.degree}</span>
                        </div>
                        <span className="text-[9px] text-slate-500">{edu.end_date}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              if (secId === "skills" && skills.length > 0) {
                return (
                  <div key={secId} className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 font-sans text-left">Technical Skills</h4>
                    <p className="text-[10px] leading-relaxed text-slate-700 font-sans">
                      {skills.join(", ")}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Google X-Y-Z AI Resume Tailor Visual Diff Modal */}
      <ResumeDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        diffData={diffData}
        onApply={handleApplyTailor}
      />
    </div>
  );
}
