"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/ui/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  User,
  GraduationCap,
  Briefcase,
  Layers,
  Wrench,
  Award,
  Globe,
  Plus,
  Sparkles,
  Calendar,
  MapPin,
} from "lucide-react";
import { mockCareerProfile, mockUser } from "@/lib/mock-data";

export default function CareerProfilePage() {
  const [profile, setProfile] = useState(mockCareerProfile);

  const handleEditSection = (section: string) => {
    toast.info(`${section} form is currently locked. Database integration is Sprint 5.`);
  };

  const handleAddEntry = (section: string) => {
    toast.info(`Add entry to ${section} will be available in next phase.`);
  };

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
            MK
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1 text-center sm:text-left min-w-0">
          <h2 className="text-base font-bold text-foreground">{mockUser.full_name}</h2>
          <p className="text-xs text-muted-foreground">{mockUser.email}</p>
          <div className="flex items-center gap-1.5 justify-center sm:justify-start pt-1 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold w-fit">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Profile Verified</span>
          </div>
        </div>
      </div>

      {/* Grid of Profile sections */}
      <div className="space-y-6">
        {/* Personal info */}
        <SectionCard
          title="Personal Info"
          description="Your basic contact details and portfolio URLs."
          onActionClick={() => handleEditSection("Personal Info")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground font-semibold block">Full Name</span>
              <span className="text-foreground font-medium">{mockUser.full_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Email Address</span>
              <span className="text-foreground font-medium">{mockUser.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Location</span>
              <span className="text-foreground font-medium">Bangalore, India</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block">Website URL</span>
              <span className="text-foreground font-medium">https://manishkuntal.dev</span>
            </div>
          </div>
        </SectionCard>

        {/* Education */}
        <SectionCard
          title="Education"
          description="Degrees, fields of study, and academic institutions."
          actionType="add"
          actionLabel="Add Degree"
          onActionClick={() => handleAddEntry("Education")}
        >
          <div className="space-y-4">
            {profile.education.map((edu, idx) => (
              <div key={idx} className="flex gap-3 text-xs relative group">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">{edu.institution}</h4>
                  <p className="text-text-secondary">{edu.degree} — {edu.field_of_study}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {edu.start_date} - {edu.end_date}
                    </span>
                    <span>GPA: {edu.gpa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Work Experience */}
        <SectionCard
          title="Work Experience"
          description="Your professional jobs, companies, and roles history."
          actionType="add"
          actionLabel="Add Experience"
          onActionClick={() => handleAddEntry("Work Experience")}
        >
          <div className="space-y-6">
            {profile.experience.map((job, idx) => (
              <div key={idx} className="flex gap-3 text-xs">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <Briefcase className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-foreground">{job.title}</h4>
                  <p className="text-text-secondary">{job.company}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {job.start_date} - {job.end_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                  </div>
                  <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 pt-1 leading-relaxed">
                    {job.bullet_points.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Skills */}
        <SectionCard
          title="Skills"
          description="Core technical and soft skills."
          onActionClick={() => handleEditSection("Skills")}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Technical Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.technical.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-semibold border border-primary/5">{s}</span>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 border-t border-border/50 pt-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Soft Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.soft.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-semibold">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Certifications */}
        <SectionCard
          title="Certifications"
          description="Industry credentials and courses."
          actionType="add"
          actionLabel="Add Certification"
          onActionClick={() => handleAddEntry("Certifications")}
        >
          <div className="space-y-4">
            {profile.certifications.map((cert, idx) => (
              <div key={idx} className="flex gap-3 text-xs">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <Award className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">{cert.name}</h4>
                  <p className="text-text-secondary">{cert.issuer}</p>
                  <span className="text-[10px] text-muted-foreground block pt-0.5">Issued: {cert.issue_date}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
