"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resumesAPI } from "@/lib/api";
import type { Resume } from "@/types";

export default function ResumeEditPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [activeSection, setActiveSection] = useState<string>("personal");
  
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const fetchResume = async () => {
    try {
      setIsLoading(true);
      const data = await resumesAPI.get(params.id);
      setResume(data);

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
    } catch {
      toast.error("Failed to load resume draft.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
  }, [params.id]);

  const handleSave = async () => {
    if (!resume) return;
    try {
      setIsSaving(true);
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
        section_order: ["personal_information", "professional_summary", "experience", "education", "skills"],
      };

      const updated = await resumesAPI.updateContent(
        params.id,
        updatedContent,
        resume.version // concurrency token check
      );
      setResume(updated);
      toast.success("Resume saved successfully!");
    } catch (err: any) {
      if (err.status === 409) {
        toast.error("Conflict warning: This resume was modified elsewhere. Please refresh to fetch newer edits.");
      } else {
        toast.error("Failed to save resume content.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const sectionsList = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "summary", label: "Professional Summary", icon: FileText },
    { id: "experience", label: "Work Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Wrench },
  ];

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
        onSave={handleSave}
        onExport={() => toast.success("Exporting PDF...")}
        isSaving={isSaving}
      />

      {/* Editor Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-8xl mx-auto w-full p-4 lg:p-6 gap-6 h-[calc(100vh-56px)]">
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

        {/* Left Side: Section Forms */}
        <div
          className={cn(
            "flex-1 flex flex-col lg:flex-row gap-6 h-full overflow-hidden",
            activeTab === "edit" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Section Navigation */}
          <div className="lg:w-48 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1.5 flex-shrink-0">
            {sectionsList.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all border text-left whitespace-nowrap lg:whitespace-normal w-full",
                  activeSection === sec.id
                    ? "bg-primary-subtle text-primary border-primary/10 shadow-xs"
                    : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <sec.icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content card */}
          <Card className="flex-1 overflow-y-auto border border-border shadow-sm bg-card p-6 h-full min-h-[400px]">
            {activeSection === "personal" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullname" className="text-xs font-semibold">Full Name</Label>
                    <Input
                      id="fullname"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                    <Input
                      id="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs font-semibold">Location</Label>
                    <Input
                      id="location"
                      value={personalInfo.location}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "summary" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Professional Summary</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="sum-text" className="text-xs font-semibold">Summary Statement</Label>
                  <Textarea
                    id="sum-text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={6}
                    className="text-xs resize-none"
                    placeholder="Write a brief overview of your skills and career direction..."
                  />
                </div>
              </div>
            )}

            {activeSection === "experience" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-sm font-bold text-foreground">Work Experience</h3>
                  <Button
                    onClick={() => setExperience([...experience, { company: "", title: "", start_date: "", end_date: "", bullet_points: [] }])}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </Button>
                </div>
                {experience.map((job, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/10 space-y-3 relative group">
                    <button
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => setExperience(experience.filter((_, i) => i !== index))}
                      aria-label="Delete work experience entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Company</span>
                        <Input
                          value={job.company}
                          onChange={(e) => {
                            const updated = [...experience];
                            updated[index].company = e.target.value;
                            setExperience(updated);
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Job Title</span>
                        <Input
                          value={job.title}
                          onChange={(e) => {
                            const updated = [...experience];
                            updated[index].title = e.target.value;
                            setExperience(updated);
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "education" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="text-sm font-bold text-foreground">Education</h3>
                  <Button
                    onClick={() => setEducation([...education, { institution: "", degree: "", field_of_study: "", end_date: "" }])}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-semibold border-border gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Degree
                  </Button>
                </div>
                {education.map((edu, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/10 space-y-3 relative group">
                    <button
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => setEducation(education.filter((_, i) => i !== index))}
                      aria-label="Delete education entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Institution</span>
                        <Input
                          value={edu.institution}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[index].institution = e.target.value;
                            setEducation(updated);
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Degree</span>
                        <Input
                          value={edu.degree}
                          onChange={(e) => {
                            const updated = [...education];
                            updated[index].degree = e.target.value;
                            setEducation(updated);
                          }}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "skills" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Skills</h3>
                <div className="flex flex-wrap gap-2 py-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs font-semibold border border-primary/10 flex items-center gap-1.5"
                    >
                      <span>{skill}</span>
                      <button
                        onClick={() => setSkills(skills.filter((_, idx) => idx !== index))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove skill: ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    id="new-skill-input"
                    className="text-xs h-9"
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
                    className="h-9 text-xs font-semibold"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Sticky Live A4 Preview */}
        <div
          className={cn(
            "lg:w-[480px] xl:w-[560px] h-full overflow-y-auto lg:sticky lg:top-0 border border-border shadow-md rounded-lg bg-card p-8 select-none font-serif flex flex-col justify-start gap-4",
            activeTab === "preview" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Mocked Resume Document */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{personalInfo.fullName}</h2>
            <p className="text-[10px] text-muted-foreground font-sans">
              {personalInfo.email} | {personalInfo.phone} | {personalInfo.location}
            </p>
          </div>

          <hr className="border-t border-border" />

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary font-sans">Professional Summary</h4>
            <p className="text-[10px] leading-relaxed text-foreground">{summary}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary font-sans">Work Experience</h4>
            {experience.map((job, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline font-sans">
                  <span className="text-[10px] font-bold text-foreground">{job.company}</span>
                  <span className="text-[9px] text-muted-foreground">{job.start_date} — {job.end_date}</span>
                </div>
                <p className="text-[9.5px] italic text-text-secondary">{job.title}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary font-sans">Education</h4>
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline text-[10px] font-sans">
                <div>
                  <span className="font-semibold text-foreground">{edu.institution}</span> — <span className="text-muted-foreground">{edu.degree}</span>
                </div>
                <span className="text-[9px] text-muted-foreground">{edu.end_date}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary font-sans text-left">Technical Skills</h4>
            <p className="text-[10px] leading-relaxed text-foreground font-sans">
              {skills.join(", ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
