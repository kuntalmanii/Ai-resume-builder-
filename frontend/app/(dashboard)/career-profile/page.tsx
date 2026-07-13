"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/ui/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { profileAPI, careerEntriesAPI, type CareerEntry } from "@/lib/api";
import type { CareerProfile } from "@/types";
import {
  GraduationCap,
  Briefcase,
  Award,
  Calendar,
  MapPin,
  Loader2,
  Trash2,
  Edit2,
  Check,
  Plus,
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CareerProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Form state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  
  const [activeType, setActiveType] = useState<string>("education");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  // Entry Form fields
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [textData, setTextData] = useState<Record<string, string>>({});
  const [bulletsText, setBulletsText] = useState("");
  const [techText, setTechText] = useState("");

  // Metadata Form fields
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [profTitle, setProfTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await profileAPI.get();
      setProfile(data);

      // Populate meta states
      setPhone(data.phone || "");
      setLocation(data.location || "");
      setProfTitle(data.professional_title || "");
      setSummary(data.professional_summary || "");
      setLinkedin(data.linkedin_url || "");
      setGithub(data.github_url || "");
      setPortfolio(data.portfolio_url || "");
    } catch {
      toast.error("Failed to load career profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleOpenAddEntry = (type: string) => {
    setActiveType(type);
    setEditingEntryId(null);
    setTitle("");
    setOrganization("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setTextData({});
    setBulletsText("");
    setTechText("");
    setIsEntryModalOpen(true);
  };

  const handleOpenEditEntry = (entry: any, type: string) => {
    setActiveType(type);
    setEditingEntryId(entry.id);
    
    // Reverse field mapping depending on section
    if (type === "education") {
      setTitle(entry.degree || "");
      setOrganization(entry.institution || "");
      setStartDate(entry.start_date || "");
      setEndDate(entry.end_date || "");
      setIsCurrent(entry.is_current || false);
      setTextData({
        field_of_study: entry.field_of_study || "",
        grade: entry.gpa || "",
        description: entry.description || "",
      });
    } else if (type === "work_experience" || type === "internship") {
      setTitle(entry.title || "");
      setOrganization(entry.company || "");
      setStartDate(entry.start_date || "");
      setEndDate(entry.end_date || "");
      setIsCurrent(entry.is_current || false);
      setTextData({
        location: entry.location || "",
        description: entry.description || "",
      });
      setBulletsText((entry.bullet_points || []).join("\n"));
    } else if (type === "project") {
      setTitle(entry.name || "");
      setOrganization("Project");
      setStartDate(entry.start_date || "");
      setEndDate(entry.end_date || "");
      setIsCurrent(false);
      setTextData({
        description: entry.description || "",
        url: entry.url || "",
        github_url: entry.github_url || "",
      });
      setTechText((entry.technologies || []).join(", "));
    } else if (type === "certification") {
      setTitle(entry.name || "");
      setOrganization(entry.issuer || "");
      setStartDate(entry.issue_date || "");
      setEndDate(entry.expiry_date || "");
      setIsCurrent(false);
      setTextData({
        credential_id: entry.credential_id || "",
        credential_url: entry.url || "",
      });
    }
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build data dictionary
      const dataPayload: Record<string, any> = { ...textData };
      if (bulletsText) {
        dataPayload.bullets = bulletsText.split("\n").filter((b) => b.trim() !== "");
      }
      if (techText) {
        dataPayload.technologies = techText.split(",").map((t) => t.trim()).filter((t) => t !== "");
      }

      const body = {
        entry_type: activeType,
        title: title || (activeType === "technical_skill" || activeType === "soft_skill" ? title : "Untitled"),
        organization: organization || "Personal",
        start_date: startDate || null,
        end_date: endDate || null,
        is_current: isCurrent,
        data: dataPayload,
        source_type: "manual" as const,
      };

      if (editingEntryId) {
        await careerEntriesAPI.update(editingEntryId, body);
        toast.success("Entry updated successfully");
      } else {
        await careerEntriesAPI.create(body);
        toast.success("Entry added successfully");
      }
      setIsEntryModalOpen(false);
      fetchProfile();
    } catch {
      toast.error("Failed to save entry.");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this profile entry?")) return;
    try {
      await careerEntriesAPI.delete(id);
      toast.success("Entry removed");
      fetchProfile();
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  const handleConfirmEntry = async (id: string) => {
    try {
      await careerEntriesAPI.confirm(id);
      toast.success("Entry verified successfully!");
      fetchProfile();
    } catch {
      toast.error("Failed to verify entry.");
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileAPI.update({
        phone,
        location,
        professional_title: profTitle,
        professional_summary: summary,
        linkedin_url: linkedin,
        github_url: github,
        portfolio_url: portfolio,
      });
      toast.success("Profile metadata saved");
      setIsMetaModalOpen(false);
      fetchProfile();
    } catch {
      toast.error("Failed to save profile details.");
    }
  };

  const handleAddSkill = async (type: "technical_skill" | "soft_skill") => {
    const nameInput = prompt(`Enter new ${type === "technical_skill" ? "technical" : "soft"} skill name:`);
    if (!nameInput?.trim()) return;

    try {
      await careerEntriesAPI.create({
        entry_type: type,
        title: nameInput.trim(),
        organization: "Profile",
        source_type: "manual",
      });
      toast.success("Skill added");
      fetchProfile();
    } catch {
      toast.error("Failed to add skill.");
    }
  };

  const handleDeleteSkill = async (skillName: string, type: "technical_skill" | "soft_skill") => {
    // Find the skill entry ID matching this name and type
    try {
      const entries = await careerEntriesAPI.list(type);
      const target = entries.find((e) => e.title.toLowerCase() === skillName.toLowerCase());
      if (target) {
        await careerEntriesAPI.delete(target.id);
        toast.success(`Removed "${skillName}"`);
        fetchProfile();
      }
    } catch {
      toast.error("Failed to remove skill.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        Failed to load career profile. Please verify your connection.
      </div>
    );
  }

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Smart Career Profile"
        description="Your unified professional record. Changes here are automatically cross-referenced by AI to target specific jobs."
      />

      {/* Profile summary header */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-6 rounded-lg shadow-sm">
        <Avatar className="w-16 h-16 bg-primary flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1 text-center sm:text-left min-w-0">
          <h2 className="text-base font-bold text-foreground">{user.full_name}</h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-1.5 justify-center sm:justify-start pt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold w-fit">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Profile Sync Active</span>
          </div>
        </div>
      </div>

      {/* Grid of Profile sections */}
      <div className="space-y-6">
        {/* Personal info */}
        <SectionCard
          title="Personal Info"
          description="Your basic contact details and portfolio URLs."
          onActionClick={() => setIsMetaModalOpen(true)}
          actionType="edit"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground font-semibold block">Full Name</span>
              <span className="text-foreground font-medium">{user.full_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Email Address</span>
              <span className="text-foreground font-medium">{user.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Location</span>
              <span className="text-foreground font-medium">{profile.location || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Phone Number</span>
              <span className="text-foreground font-medium">{profile.phone || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Professional Title</span>
              <span className="text-foreground font-medium">{profile.professional_title || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Professional Summary</span>
              <p className="text-foreground font-medium leading-relaxed mt-0.5 truncate max-w-sm">
                {profile.professional_summary || "Not set"}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Education */}
        <SectionCard
          title="Education"
          description="Degrees, fields of study, and academic institutions."
          actionType="add"
          actionLabel="Add Degree"
          onActionClick={() => handleOpenAddEntry("education")}
        >
          {profile.education.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No education entries added yet.</p>
          ) : (
            <div className="space-y-4">
              {profile.education.map((edu: any) => (
                <div key={edu.id} className="flex gap-3 text-xs relative group justify-between items-start border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {edu.institution}
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-[4px] text-[8px] font-bold border uppercase tracking-wider",
                          edu.verification_status === "source_verified"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                            : edu.verification_status === "user_confirmed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-muted border-border text-muted-foreground"
                        )}>
                          {edu.verification_status ? edu.verification_status.replace("_", " ") : "unverified"}
                        </span>
                      </h4>
                      <p className="text-text-secondary">{edu.degree} — {edu.field_of_study}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {edu.start_date} - {edu.end_date || "Present"}
                        </span>
                        <span>GPA: {edu.gpa || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {edu.verification_status === "unverified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirmEntry(edu.id)}
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 px-2"
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditEntry(edu, "education")}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(edu.id)}
                      className="h-7 w-7 p-0 text-error hover:bg-error-subtle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Work Experience */}
        <SectionCard
          title="Work Experience"
          description="Your professional jobs, companies, and roles history."
          actionType="add"
          actionLabel="Add Experience"
          onActionClick={() => handleOpenAddEntry("work_experience")}
        >
          {profile.experience.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No work experience entries added yet.</p>
          ) : (
            <div className="space-y-6">
              {profile.experience.map((job: any) => (
                <div key={job.id} className="flex gap-3 text-xs relative group justify-between items-start border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Briefcase className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {job.title}
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-[4px] text-[8px] font-bold border uppercase tracking-wider",
                          job.verification_status === "source_verified"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                            : job.verification_status === "user_confirmed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-muted border-border text-muted-foreground"
                        )}>
                          {job.verification_status ? job.verification_status.replace("_", " ") : "unverified"}
                        </span>
                      </h4>
                      <p className="text-text-secondary">{job.company}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {job.start_date} - {job.end_date || "Present"}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        )}
                      </div>
                      {job.bullet_points && job.bullet_points.length > 0 && (
                        <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 pt-1 leading-relaxed">
                          {job.bullet_points.map((bullet: string, bIdx: number) => (
                            <li key={bIdx}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {job.verification_status === "unverified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirmEntry(job.id)}
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 px-2"
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditEntry(job, "work_experience")}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(job.id)}
                      className="h-7 w-7 p-0 text-error hover:bg-error-subtle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Projects */}
        <SectionCard
          title="Projects"
          description="Personal and open-source applications built."
          actionType="add"
          actionLabel="Add Project"
          onActionClick={() => handleOpenAddEntry("project")}
        >
          {profile.projects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No projects added yet.</p>
          ) : (
            <div className="space-y-4">
              {profile.projects.map((proj: any) => (
                <div key={proj.id} className="flex gap-3 text-xs relative group justify-between items-start border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Globe className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {proj.name}
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-[4px] text-[8px] font-bold border uppercase tracking-wider",
                          proj.verification_status === "source_verified"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                            : proj.verification_status === "user_confirmed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-muted border-border text-muted-foreground"
                        )}>
                          {proj.verification_status ? proj.verification_status.replace("_", " ") : "unverified"}
                        </span>
                      </h4>
                      <p className="text-text-secondary">{proj.description}</p>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {proj.technologies.map((t: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.2 bg-muted text-muted-foreground rounded text-[9px] font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {proj.verification_status === "unverified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirmEntry(proj.id)}
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 px-2"
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditEntry(proj, "project")}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(proj.id)}
                      className="h-7 w-7 p-0 text-error hover:bg-error-subtle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Skills */}
        <SectionCard
          title="Skills"
          description="Core technical and soft skills."
          customAction={
            <div className="flex items-center gap-1.5">
              <Button size="xs" variant="outline" onClick={() => handleAddSkill("technical_skill")} className="h-7 text-[10px] font-semibold">
                + Technical
              </Button>
              <Button size="xs" variant="outline" onClick={() => handleAddSkill("soft_skill")} className="h-7 text-[10px] font-semibold">
                + Soft
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Technical Skills</span>
              {profile.skills.technical.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No technical skills added.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.technical.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      onClick={() => handleDeleteSkill(s, "technical_skill")}
                      className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-semibold border border-primary/5 cursor-pointer hover:bg-red-500/10 hover:text-error hover:border-red-500/20 group transition-colors flex items-center gap-1"
                      title="Click to remove skill"
                    >
                      <span>{s}</span>
                      <span className="text-[8px] text-muted-foreground group-hover:text-error font-normal opacity-40 group-hover:opacity-100">×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5 border-t border-border/50 pt-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Soft Skills</span>
              {profile.skills.soft.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No soft skills added.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.soft.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      onClick={() => handleDeleteSkill(s, "soft_skill")}
                      className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-semibold cursor-pointer hover:bg-red-500/10 hover:text-error hover:border-red-500/20 group transition-colors flex items-center gap-1"
                      title="Click to remove skill"
                    >
                      <span>{s}</span>
                      <span className="text-[8px] text-muted-foreground group-hover:text-error font-normal opacity-40 group-hover:opacity-100">×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Certifications */}
        <SectionCard
          title="Certifications"
          description="Industry credentials and courses."
          actionType="add"
          actionLabel="Add Certification"
          onActionClick={() => handleOpenAddEntry("certification")}
        >
          {profile.certifications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No certifications added yet.</p>
          ) : (
            <div className="space-y-4">
              {profile.certifications.map((cert: any) => (
                <div key={cert.id} className="flex gap-3 text-xs relative group justify-between items-start border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Award className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {cert.name}
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-[4px] text-[8px] font-bold border uppercase tracking-wider",
                          cert.verification_status === "source_verified"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                            : cert.verification_status === "user_confirmed"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-muted border-border text-muted-foreground"
                        )}>
                          {cert.verification_status ? cert.verification_status.replace("_", " ") : "unverified"}
                        </span>
                      </h4>
                      <p className="text-text-secondary">{cert.issuer}</p>
                      <span className="text-[10px] text-muted-foreground block pt-0.5">Issued: {cert.issue_date}</span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {cert.verification_status === "unverified" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirmEntry(cert.id)}
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 px-2"
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditEntry(cert, "certification")}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(cert.id)}
                      className="h-7 w-7 p-0 text-error hover:bg-error-subtle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ─── Entry Form Modal ─── */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="font-bold text-base text-foreground capitalize">
                {editingEntryId ? "Edit" : "Add"} {activeType.replace("_", " ")}
              </h3>
            </div>
            <form onSubmit={handleSaveEntry} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="font-semibold text-muted-foreground">Title / Role / Degree</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                    placeholder="e.g. B.S. Computer Science / Software Engineer"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="font-semibold text-muted-foreground">Organization / Company / Institution</label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                    placeholder="e.g. Stanford University / Google"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Start Date</label>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                    placeholder="e.g. Jun 2021"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">End Date</label>
                  <input
                    type="text"
                    disabled={isCurrent}
                    value={isCurrent ? "" : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary disabled:opacity-50"
                    placeholder="e.g. May 2023"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCurrentCheck"
                    checked={isCurrent}
                    onChange={(e) => {
                      setIsCurrent(e.target.checked);
                      if (e.target.checked) setEndDate("");
                    }}
                    className="rounded border-border"
                  />
                  <label htmlFor="isCurrentCheck" className="font-semibold text-foreground cursor-pointer">
                    I currently work / study here
                  </label>
                </div>

                {activeType === "education" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Field of Study</label>
                      <input
                        type="text"
                        value={textData.field_of_study || ""}
                        onChange={(e) => setTextData(p => ({ ...p, field_of_study: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="e.g. Machine Learning"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Grade / GPA</label>
                      <input
                        type="text"
                        value={textData.grade || ""}
                        onChange={(e) => setTextData(p => ({ ...p, grade: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="e.g. 3.92 / 4.0"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="font-semibold text-muted-foreground">Description</label>
                      <textarea
                        value={textData.description || ""}
                        onChange={(e) => setTextData(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="Key coursework or academic honors..."
                      />
                    </div>
                  </>
                )}

                {(activeType === "work_experience" || activeType === "internship") && (
                  <>
                    <div className="space-y-1.5 col-span-2">
                      <label className="font-semibold text-muted-foreground">Location</label>
                      <input
                        type="text"
                        value={textData.location || ""}
                        onChange={(e) => setTextData(p => ({ ...p, location: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="font-semibold text-muted-foreground">Bullet Points (One per line)</label>
                      <textarea
                        value={bulletsText}
                        onChange={(e) => setBulletsText(e.target.value)}
                        rows={4}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary font-mono text-[10px]"
                        placeholder="Developed web applications using React&#10;Reduced API query times by 30%"
                      />
                    </div>
                  </>
                )}

                {activeType === "project" && (
                  <>
                    <div className="space-y-1.5 col-span-2">
                      <label className="font-semibold text-muted-foreground">Description</label>
                      <input
                        type="text"
                        value={textData.description || ""}
                        onChange={(e) => setTextData(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="Brief project description..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Project Link</label>
                      <input
                        type="text"
                        value={textData.url || ""}
                        onChange={(e) => setTextData(p => ({ ...p, url: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">GitHub Link</label>
                      <input
                        type="text"
                        value={textData.github_url || ""}
                        onChange={(e) => setTextData(p => ({ ...p, github_url: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="https://github.com/user/repo"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="font-semibold text-muted-foreground">Technologies Used (Comma separated)</label>
                      <input
                        type="text"
                        value={techText}
                        onChange={(e) => setTechText(e.target.value)}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                        placeholder="React, Node.js, PostgreSQL"
                      />
                    </div>
                  </>
                )}

                {activeType === "certification" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Credential ID</label>
                      <input
                        type="text"
                        value={textData.credential_id || ""}
                        onChange={(e) => setTextData(p => ({ ...p, credential_id: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Credential URL</label>
                      <input
                        type="text"
                        value={textData.credential_url || ""}
                        onChange={(e) => setTextData(p => ({ ...p, credential_url: e.target.value }))}
                        className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsEntryModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Metadata Form Modal ─── */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="font-bold text-base text-foreground">Edit Profile Information</h3>
            </div>
            <form onSubmit={handleSaveMetadata} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Location (City, Country)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Professional Title</label>
                <input
                  type="text"
                  value={profTitle}
                  onChange={(e) => setProfTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Professional Summary</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">LinkedIn URL</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">GitHub URL</label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Portfolio Website URL</label>
                <input
                  type="text"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="w-full bg-background border border-border rounded p-2 text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsMetaModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
