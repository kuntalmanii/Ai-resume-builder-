"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resumeImportsAPI, type ResumeImportSessionResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ResumeContent, PersonalInfo } from "@/types";

export default function ResumeImportReviewPage({ params }: { params: { importId: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<ResumeImportSessionResponse | null>(null);
  const [parsedDoc, setParsedDoc] = useState<ResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("personal");

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
      const data = await resumeImportsAPI.get(params.importId);
      
      // Redirect if already finalized
      if (data.status === "finalized") {
        toast.info("This import has already been finalized.");
        router.push("/resumes");
        return;
      }

      setSession(data);
      setParsedDoc(data.parsed_document || {});
      setResumeTitle(data.original_filename ? `Imported - ${data.original_filename.replace(/\.[^/.]+$/, "")}` : "Imported Resume");
    } catch (err: any) {
      toast.error(err.message || "Failed to load import session.");
      router.push("/upload");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [params.importId]);

  const handleSaveDraft = async () => {
    if (!parsedDoc) return;
    try {
      setIsSavingDraft(true);
      await resumeImportsAPI.updateDocument(params.importId, parsedDoc);
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
      
      // Save current edits first
      await resumeImportsAPI.updateDocument(params.importId, parsedDoc);
      
      // Finalize
      const resume = await resumeImportsAPI.finalize(params.importId, {
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
        await resumeImportsAPI.delete(params.importId);
        toast.info("Import cancelled.");
        router.push("/upload");
      } catch {
        // Fallback redirection even if delete fails
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
    const pi: Partial<PersonalInfo> = parsedDoc.personal_information || {};
    setParsedDoc({
      ...parsedDoc,
      personal_information: {
        full_name: pi.full_name || "",
        email: pi.email || "",
        phone: pi.phone || "",
        location: pi.location || "",
        professional_title: pi.professional_title || "",
        linkedin_url: pi.linkedin_url || "",
        github_url: pi.github_url || "",
        portfolio_url: pi.portfolio_url || "",
        [field]: value,
      } as PersonalInfo,
    });
  };

  const getConfidenceLabel = (val: number | undefined) => {
    if (val === undefined) return { label: "Medium", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (val >= 0.9) return { label: "High confidence", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    if (val >= 0.7) return { label: "Medium confidence", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (val >= 0.5) return { label: "Low confidence", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
    return { label: "Needs review", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Loading parsed resume workspace...</p>
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

  // Safe parsed document arrays
  const eduList = parsedDoc.education || [];
  const expList = parsedDoc.experience || [];
  const projList = parsedDoc.projects || [];
  const skillsGroups = parsedDoc.skills || [];
  const certsList = parsedDoc.certifications || [];
  const achsList = parsedDoc.achievements || [];
  const posList = parsedDoc.positions_of_responsibility || [];
  const langList = parsedDoc.languages || [];
  const intList = parsedDoc.interests || [];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Review Sticky Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground">Review Parser: {session.original_filename}</h1>
                <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {session.document_type}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Review, correct inaccuracies, and choose which entries to import.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F1F3F6] border border-border/80 px-2 py-1.5 rounded-md">
              <span className="text-[10px] font-semibold text-muted-foreground mr-1">Title:</span>
              <input
                type="text"
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-foreground outline-none border-none max-w-[140px] focus:ring-0 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#F1F3F6] border border-border/80 px-2 py-1.5 rounded-md">
              <span className="text-[10px] font-semibold text-muted-foreground mr-1">Template:</span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-foreground outline-none border-none cursor-pointer focus:ring-0 focus:outline-none"
              >
                <option value="modern">Modern</option>
                <option value="professional">Professional</option>
                <option value="creative">Creative</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 border-border text-xs font-semibold gap-1.5"
            >
              {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save draft</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 text-xs font-semibold gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </Button>

            <Button
              onClick={handleFinalize}
              disabled={isSavingDraft || isFinalizing}
              className="h-9 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground px-4 shadow-sm"
            >
              {isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Finalize import</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-6 gap-6 h-[calc(100vh-68px)] overflow-hidden">
        {/* Left Side: Navigation + Editors */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 h-full overflow-hidden">
          {/* Vertical section navigation with confidence indicators */}
          <div className="md:w-56 flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1 flex-shrink-0">
            {sectionsList.map((sec) => {
              const conf = getConfidenceLabel(sec.confidence);
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all border text-left whitespace-nowrap md:whitespace-normal w-full",
                    activeSection === sec.id
                      ? "bg-primary-subtle text-primary border-primary/10 shadow-xs"
                      : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <sec.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{sec.label}</span>
                  </div>
                  {sec.confidence !== undefined && (
                    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border hidden md:inline-block", conf.color)}>
                      {conf.label.split(" ")[0]}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Smart Career Profile Import Controls */}
            <div className="mt-4 border-t border-border/60 pt-4 hidden md:block space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="import-toggle"
                  checked={importToCareerProfile}
                  onChange={(e) => setImportToCareerProfile(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <Label htmlFor="import-toggle" className="text-[11px] font-bold text-foreground cursor-pointer flex items-center gap-1">
                  <span>Import to Career Profile</span>
                </Label>
              </div>

              {importToCareerProfile && (
                <div className="pl-5.5 space-y-2 border-l border-border/50">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Select sections to import:</p>
                  {[
                    { id: "education", label: "Education" },
                    { id: "experience", label: "Experience" },
                    { id: "projects", label: "Projects" },
                    { id: "skills", label: "Skills" },
                    { id: "certifications", label: "Certifications" },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`chk-${item.id}`}
                        checked={selectedEntries.includes(item.id)}
                        onChange={() => toggleImportSection(item.id)}
                        className="rounded border-border text-primary focus:ring-primary w-3 h-3"
                      />
                      <label htmlFor={`chk-${item.id}`} className="text-[10px] text-text-secondary cursor-pointer">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editor Workspace Card */}
          <Card className="flex-1 overflow-y-auto border border-border shadow-xs bg-card p-5 h-full">
            {/* Show warnings if any */}
            {session.parsing_warnings && session.parsing_warnings.length > 0 && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-md text-[11px] flex gap-2 items-start leading-relaxed">
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

            {activeSection === "personal" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-foreground border-b border-border pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="full_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <Input
                      id="full_name"
                      value={parsedDoc.personal_information?.full_name || ""}
                      onChange={(e) => updatePersonalInfo("full_name", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input
                      id="email"
                      value={parsedDoc.personal_information?.email || ""}
                      onChange={(e) => updatePersonalInfo("email", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                    <Input
                      id="phone"
                      value={parsedDoc.personal_information?.phone || ""}
                      onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                    <Input
                      id="location"
                      value={parsedDoc.personal_information?.location || ""}
                      onChange={(e) => updatePersonalInfo("location", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Professional Title</Label>
                    <Input
                      id="title"
                      value={parsedDoc.personal_information?.professional_title || ""}
                      onChange={(e) => updatePersonalInfo("professional_title", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="linkedin" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={parsedDoc.personal_information?.linkedin_url || ""}
                      onChange={(e) => updatePersonalInfo("linkedin_url", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="github" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GitHub URL</Label>
                    <Input
                      id="github"
                      value={parsedDoc.personal_information?.github_url || ""}
                      onChange={(e) => updatePersonalInfo("github_url", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="portfolio" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Portfolio/Website</Label>
                    <Input
                      id="portfolio"
                      value={parsedDoc.personal_information?.portfolio_url || ""}
                      onChange={(e) => updatePersonalInfo("portfolio_url", e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "summary" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-foreground border-b border-border pb-2">Professional Summary</h3>
                <div className="space-y-1">
                  <Label htmlFor="summary_statement" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Summary Text</Label>
                  <Textarea
                    id="summary_statement"
                    value={parsedDoc.professional_summary || ""}
                    onChange={(e) => setParsedDoc({ ...parsedDoc, professional_summary: e.target.value })}
                    rows={8}
                    className="text-xs resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {activeSection === "experience" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Work Experience</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </Button>
                </div>

                {expList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No experience entries parsed.</p>
                ) : (
                  <div className="space-y-4">
                    {expList.map((exp, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                        <button
                          onClick={() =>
                            setParsedDoc({
                              ...parsedDoc,
                              experience: expList.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Company</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Position</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">End Date</span>
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
                              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <label htmlFor={`exp-curr-${idx}`} className="text-xs text-foreground cursor-pointer font-medium">
                              I currently work here
                            </label>
                          </div>
                        </div>

                        {/* Bullets */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Bullet Points</span>
                            <Button
                              onClick={() => {
                                const list = [...expList];
                                list[idx].bullet_points = [...(list[idx].bullet_points || []), ""];
                                setParsedDoc({ ...parsedDoc, experience: list });
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[9px] font-semibold gap-1 text-primary hover:bg-primary-subtle"
                            >
                              <Plus className="w-3 h-3" /> Add bullet
                            </Button>
                          </div>
                          {(exp.bullet_points || []).map((bullet: string, bIdx: number) => (
                            <div key={bIdx} className="flex gap-2 items-center">
                              <span className="text-muted-foreground">•</span>
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
                                className="text-muted-foreground hover:text-destructive"
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
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Education</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Degree
                  </Button>
                </div>

                {eduList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No education entries parsed.</p>
                ) : (
                  <div className="space-y-4">
                    {eduList.map((edu, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                        <button
                          onClick={() =>
                            setParsedDoc({
                              ...parsedDoc,
                              education: eduList.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Institution</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Degree</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Field of Study</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Graduation Date</span>
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
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Skills</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </Button>
                </div>

                {skillsGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No skills categories parsed.</p>
                ) : (
                  <div className="space-y-4">
                    {skillsGroups.map((group, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                        <button
                          onClick={() =>
                            setParsedDoc({
                              ...parsedDoc,
                              skills: skillsGroups.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Category Name</span>
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

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Skills list (comma separated)</span>
                          <Input
                            value={(group.skills || []).join(", ")}
                            onChange={(e) => {
                              const list = [...skillsGroups];
                              list[idx].skills = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                              setParsedDoc({ ...parsedDoc, skills: list });
                            }}
                            placeholder="React, Next.js, Node.js"
                            className="text-xs h-8.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "projects" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Projects</h3>
                  <Button
                    onClick={() =>
                      setParsedDoc({
                        ...parsedDoc,
                        projects: [
                          ...projList,
                          { name: "New Project", description: "", url: "", github_url: "", start_date: "", end_date: "", technologies: [] },
                        ],
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </Button>
                </div>

                {projList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No projects parsed.</p>
                ) : (
                  <div className="space-y-4">
                    {projList.map((proj, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                        <button
                          onClick={() =>
                            setParsedDoc({
                              ...parsedDoc,
                              projects: projList.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Project Name</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Project URL</span>
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
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</span>
                            <Input
                              value={proj.start_date || ""}
                              onChange={(e) => {
                                const list = [...projList];
                                list[idx].start_date = e.target.value;
                                setParsedDoc({ ...parsedDoc, projects: list });
                              }}
                              className="text-xs h-8.5"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">End Date</span>
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
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Description</span>
                          <Textarea
                            value={proj.description || ""}
                            onChange={(e) => {
                              const list = [...projList];
                              list[idx].description = e.target.value;
                              setParsedDoc({ ...parsedDoc, projects: list });
                            }}
                            rows={3}
                            className="text-xs resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Certifications, Achievements, Positions, Languages, Interests */}
            {activeSection === "certifications" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Certifications</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Cert
                  </Button>
                </div>
                {certsList.map((cert, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                    <button
                      onClick={() =>
                        setParsedDoc({
                          ...parsedDoc,
                          certifications: certsList.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Certification Name</span>
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
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Issuer</span>
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

            {activeSection === "achievements" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Achievements</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Achievement
                  </Button>
                </div>
                {achsList.map((ach, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                    <button
                      onClick={() =>
                        setParsedDoc({
                          ...parsedDoc,
                          achievements: achsList.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Title</span>
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
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Description</span>
                        <Textarea
                          value={ach.description || ""}
                          onChange={(e) => {
                            const list = [...achsList];
                            list[idx].description = e.target.value;
                            setParsedDoc({ ...parsedDoc, achievements: list });
                          }}
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "positions" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Positions of Responsibility</h3>
                  <Button
                    onClick={() =>
                      setParsedDoc({
                        ...parsedDoc,
                        positions_of_responsibility: [
                          ...posList,
                          { organization: "New Organization", role: "New Role", start_date: "", end_date: "", description: "" },
                        ],
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Role
                  </Button>
                </div>
                {posList.map((pos, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                    <button
                      onClick={() =>
                        setParsedDoc({
                          ...parsedDoc,
                          positions_of_responsibility: posList.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Organization</span>
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
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Role/Position</span>
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

            {activeSection === "languages" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Languages</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </Button>
                </div>
                {langList.map((lang, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                    <button
                      onClick={() =>
                        setParsedDoc({
                          ...parsedDoc,
                          languages: langList.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Language</span>
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
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Proficiency</span>
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

            {activeSection === "interests" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-xs font-bold text-foreground">Interests</h3>
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
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Interest
                  </Button>
                </div>
                {intList.map((item, idx) => (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-[#F1F3F6]/30 space-y-3 relative group">
                    <button
                      onClick={() =>
                        setParsedDoc({
                          ...parsedDoc,
                          interests: intList.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Interest Name</span>
                      <Input
                        value={item || ""}
                        onChange={(e) => {
                          const list = [...intList];
                          list[idx] = e.target.value;
                          setParsedDoc({ ...parsedDoc, interests: list });
                        }}
                        className="text-xs h-8.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Sticky A4 Preview */}
        <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] h-full overflow-y-auto border border-border shadow-xs rounded-lg bg-card p-6 select-none font-serif flex-col justify-start gap-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{parsedDoc.personal_information?.full_name || "Name"}</h2>
            <p className="text-[9px] text-muted-foreground font-sans leading-normal">
              {[
                parsedDoc.personal_information?.email,
                parsedDoc.personal_information?.phone,
                parsedDoc.personal_information?.location,
              ]
                .filter(Boolean)
                .join("  |  ")}
            </p>
            <p className="text-[9.5px] italic text-primary/80 font-sans">
              {parsedDoc.personal_information?.professional_title}
            </p>
          </div>

          <hr className="border-t border-border" />

          {/* Professional Summary */}
          {parsedDoc.professional_summary && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans">Professional Summary</h4>
              <p className="text-[9.5px] leading-relaxed text-foreground">{parsedDoc.professional_summary}</p>
            </div>
          )}

          {/* Experience */}
          {expList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans">Work Experience</h4>
              {expList.map((job, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline font-sans">
                    <span className="text-[9.5px] font-bold text-foreground">{job.company}</span>
                    <span className="text-[8.5px] text-muted-foreground">
                      {job.start_date} — {job.end_date || (job.is_current ? "Present" : "")}
                    </span>
                  </div>
                  <p className="text-[9px] italic text-text-secondary">{job.title}</p>
                  {job.bullet_points && job.bullet_points.length > 0 && (
                    <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                      {job.bullet_points.map((b: string, bIdx: number) => (
                        <li key={bIdx} className="text-[9px] leading-relaxed text-foreground">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {eduList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans">Education</h4>
              {eduList.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-baseline text-[9.5px] font-sans">
                  <div>
                    <span className="font-bold text-foreground">{edu.institution}</span> — <span className="text-muted-foreground">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</span>
                  </div>
                  <span className="text-[8.5px] text-muted-foreground">{edu.end_date}</span>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {skillsGroups.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans">Technical Skills</h4>
              {skillsGroups.map((g, idx) => (
                <p key={idx} className="text-[9.5px] leading-relaxed text-foreground font-sans">
                  <strong className="text-foreground">{g.category}:</strong> {g.skills.join(", ")}
                </p>
              ))}
            </div>
          )}

          {/* Projects */}
          {projList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans">Projects</h4>
              {projList.map((proj, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline font-sans">
                    <span className="text-[9.5px] font-bold text-foreground">{proj.name}</span>
                    <span className="text-[8.5px] text-muted-foreground">{proj.start_date} — {proj.end_date}</span>
                  </div>
                  {proj.url && <p className="text-[8.5px] text-primary/80 font-sans">{proj.url}</p>}
                  <p className="text-[9.5px] leading-relaxed text-foreground">{proj.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
