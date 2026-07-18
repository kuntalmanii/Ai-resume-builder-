"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Eye, Check, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Template {
  id: string;
  name: string;
  description: string;
  category: "classic" | "modern" | "minimal";
}

const templates: Template[] = [
  {
    id: "classic",
    name: "Classic Academic",
    description: "Traditional Times New Roman format preferred by corporate recruiters.",
    category: "classic",
  },
  {
    id: "executive",
    name: "Executive Elegant",
    description: "Elegant Garamond-style layout with thin borders and navy/gold accents, ideal for leadership and executive roles.",
    category: "classic",
  },
  {
    id: "modern",
    name: "Modern Standard",
    description: "Sleek sans-serif typography with clean dividers for tech and startup roles.",
    category: "modern",
  },
  {
    id: "hybrid",
    name: "Developer Hybrid",
    description: "A premium two-column layout separating skills/details on the left and work chronology on the right.",
    category: "modern",
  },
  {
    id: "minimal",
    name: "Minimalist Compact",
    description: "A compact layout focusing entirely on typography, white-space density, and layout balance.",
    category: "minimal",
  },
];

const sampleResumeData = {
  personal_information: {
    full_name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    professional_title: "Senior Full Stack Engineer",
  },
  professional_summary: "Passionate software engineer with over 6 years of experience building scalable web applications and leading engineering teams. Expert in React, Next.js, Node.js, and cloud deployments.",
  education: [
    {
      institution: "Stanford University",
      degree: "M.S. in Computer Science",
      field_of_study: "Software Engineering",
      start_date: "2018",
      end_date: "2020",
      gpa: "3.9",
      description: "",
      is_current: false,
    }
  ],
  experience: [
    {
      company: "Tech Corp",
      title: "Senior Software Engineer",
      location: "San Francisco, CA",
      start_date: "2021",
      end_date: "Present",
      is_current: true,
      description: "",
      bullet_points: [
        "Led a team of 4 engineers to migrate legacy infrastructure to modern Next.js frameworks, improving LCP by 40%.",
        "Designed and implemented high-throughput REST APIs handling over 10M daily requests with a 99.9% uptime record.",
        "Introduced automated unit and integration tests, increasing coverage from 20% to 85%."
      ]
    }
  ],
  skills: [
    {
      category: "Languages",
      skills: ["TypeScript", "JavaScript", "Python", "Golang", "SQL"]
    },
    {
      category: "Frameworks & Tools",
      skills: ["React", "Next.js", "Node.js", "Docker", "AWS", "Kubernetes"]
    }
  ]
};

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("modern");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const handleUseTemplate = (templateId: string) => {
    toast.success(`Selected template: "${templateId}". Launching editor...`);
    router.push(`/resumes/resume-new/edit?template=${templateId}`);
  };

  const filteredTemplates = templates.filter((t: Template) =>
    activeFilter === "all" ? true : t.category === activeFilter
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Resume Templates Gallery"
        description="Choose from our collection of ATS-safe layouts designed to pass corporate parser screeners."
      />

      {/* Categories Filter bar */}
      <div className="flex gap-2 border-b border-border pb-3 bg-transparent p-1 rounded-lg">
        {["all", "classic", "modern", "minimal"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-md transition-colors capitalize",
              activeFilter === cat
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {filteredTemplates.map((template: Template) => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                "flex flex-col h-full border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group cursor-pointer",
                isSelected ? "border-primary ring-1 ring-primary" : "border-border"
              )}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              {/* Visual document mockup card header */}
              <div className="h-44 bg-muted/30 border-b border-border flex items-center justify-center p-6 relative">
                <FileText className="w-16 h-16 text-muted-foreground/30 group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ATS Safe</span>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary text-white p-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">{template.name}</CardTitle>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 mt-auto flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplateId(template.id);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-semibold h-9 border-border"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  <span>Preview</span>
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template.id);
                  }}
                  size="sm"
                  className="flex-1 text-xs font-semibold h-9"
                >
                  Use layout
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dynamic Preview Modal */}
      <AnimatePresence>
        {previewTemplateId && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                    Preview Layout: {templates.find(t => t.id === previewTemplateId)?.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Interactive visualization of this ATS-safe format using sample profile data.
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPreviewTemplateId(null)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </Button>
              </div>

              {/* A4 Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/40 flex justify-center items-start">
                <div
                  className={cn(
                    "w-[500px] min-h-[700px] bg-white text-slate-800 p-8 shadow-md border border-slate-200/80 select-none flex flex-col justify-start gap-4",
                    (previewTemplateId === "classic" || previewTemplateId === "executive") && "font-serif",
                    (previewTemplateId === "modern" || previewTemplateId === "hybrid") && "font-sans",
                    previewTemplateId === "minimal" && "font-sans tracking-wide text-[8.5px]"
                  )}
                >
                  {previewTemplateId === "hybrid" ? (
                    /* TWO COLUMN HYBRID LAYOUT */
                    <div className="grid grid-cols-12 gap-5 h-full text-[8.5px]">
                      {/* Left Column (4/12) */}
                      <div className="col-span-4 border-r border-slate-100 pr-4 space-y-4">
                        <div className="space-y-1">
                          <h2 className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight">
                            {sampleResumeData.personal_information.full_name}
                          </h2>
                          <p className="text-primary font-bold text-[8px]">
                            {sampleResumeData.personal_information.professional_title}
                          </p>
                        </div>
                        
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <h4 className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Contact</h4>
                          <p className="text-slate-600 leading-normal">{sampleResumeData.personal_information.email}</p>
                          <p className="text-slate-600 leading-normal">{sampleResumeData.personal_information.phone}</p>
                          <p className="text-slate-600 leading-normal">{sampleResumeData.personal_information.location}</p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <h4 className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Technical Skills</h4>
                          {sampleResumeData.skills.map((g, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className="font-bold text-slate-700">{g.category}</span>
                              <p className="text-slate-500 leading-relaxed">{g.skills.join(", ")}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column (8/12) */}
                      <div className="col-span-8 space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-[9px] font-extrabold uppercase tracking-wider text-primary">About Me</h4>
                          <p className="leading-relaxed text-slate-700">{sampleResumeData.professional_summary}</p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans">Experience</h4>
                          {sampleResumeData.experience.map((job, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-baseline font-sans">
                                <span className="font-bold text-slate-800">{job.company}</span>
                                <span className="text-[7.5px] text-slate-400 font-medium">{job.start_date} — {job.end_date}</span>
                              </div>
                              <p className="text-[8px] font-medium text-slate-500 italic">{job.title}</p>
                              <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                                {job.bullet_points.map((b, bIdx) => (
                                  <li key={bIdx} className="text-slate-600 leading-relaxed">{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans">Education</h4>
                          {sampleResumeData.education.map((edu, idx) => (
                            <div key={idx} className="flex justify-between items-baseline font-sans">
                              <div>
                                <span className="font-bold text-slate-800">{edu.institution}</span>
                                <span className="text-slate-500"> — {edu.degree} in {edu.field_of_study}</span>
                              </div>
                              <span className="text-[7.5px] text-slate-400 font-medium">{edu.end_date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SINGLE COLUMN LAYOUTS */
                    <div className="space-y-4">
                      {/* Personal info */}
                      <div className={cn(
                        "text-center space-y-1", 
                        previewTemplateId === "minimal" && "text-left border-l-4 border-primary pl-2.5",
                        previewTemplateId === "executive" && "border-b border-slate-900 pb-2"
                      )}>
                        <h2 className={cn(
                          "text-sm font-extrabold tracking-tight text-slate-900",
                          previewTemplateId === "executive" && "text-blue-900 text-base"
                        )}>
                          {sampleResumeData.personal_information.full_name}
                        </h2>
                        <p className="text-[8px] text-slate-500 font-sans leading-normal">
                          {[
                            sampleResumeData.personal_information.email,
                            sampleResumeData.personal_information.phone,
                            sampleResumeData.personal_information.location,
                          ].join("  |  ")}
                        </p>
                        <p className={cn(
                          "text-[8.5px] font-bold text-primary font-sans",
                          previewTemplateId === "executive" && "text-amber-600 uppercase tracking-widest text-[7.5px]"
                        )}>
                          {sampleResumeData.personal_information.professional_title}
                        </p>
                      </div>

                      {previewTemplateId !== "executive" && <hr className="border-t border-slate-100" />}

                      {/* Summary */}
                      <div className="space-y-1">
                        <h4 className={cn(
                          "text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans",
                          previewTemplateId === "executive" && "text-blue-900 font-serif border-b border-slate-200 pb-0.5"
                        )}>Professional Summary</h4>
                        <p className="text-[8.5px] leading-relaxed text-slate-700">{sampleResumeData.professional_summary}</p>
                      </div>

                      {/* Experience */}
                      <div className="space-y-2">
                        <h4 className={cn(
                          "text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans",
                          previewTemplateId === "executive" && "text-blue-900 font-serif border-b border-slate-200 pb-0.5"
                        )}>Work Experience</h4>
                        {sampleResumeData.experience.map((job, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-baseline font-sans">
                              <span className={cn("text-[8.5px] font-bold text-slate-800", previewTemplateId === "executive" && "font-serif")}>{job.company}</span>
                              <span className="text-[7.5px] text-slate-400 font-medium">
                                {job.start_date} — {job.end_date}
                              </span>
                            </div>
                            <p className="text-[8px] font-medium text-slate-500">{job.title}</p>
                            <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                              {job.bullet_points.map((b, bIdx) => (
                                <li key={bIdx} className="text-[8px] leading-relaxed text-slate-600">{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Education */}
                      <div className="space-y-1.5">
                        <h4 className={cn(
                          "text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans",
                          previewTemplateId === "executive" && "text-blue-900 font-serif border-b border-slate-200 pb-0.5"
                        )}>Education</h4>
                        {sampleResumeData.education.map((edu, idx) => (
                          <div key={idx} className="flex justify-between items-baseline text-[8px] font-sans">
                            <div>
                              <span className={cn("font-bold text-slate-800", previewTemplateId === "executive" && "font-serif")}>{edu.institution}</span> — <span className="text-slate-500">{edu.degree} in {edu.field_of_study}</span>
                            </div>
                            <span className="text-[7.5px] text-slate-400 font-medium">{edu.end_date}</span>
                          </div>
                        ))}
                      </div>

                      {/* Skills */}
                      <div className="space-y-1.5">
                        <h4 className={cn(
                          "text-[9px] font-extrabold uppercase tracking-wider text-primary font-sans",
                          previewTemplateId === "executive" && "text-blue-900 font-serif border-b border-slate-200 pb-0.5"
                        )}>Technical Skills</h4>
                        {sampleResumeData.skills.map((g, idx) => (
                          <p key={idx} className="text-[8px] leading-relaxed text-slate-600 font-sans">
                            <strong className="text-slate-800">{g.category}:</strong> {g.skills.join(", ")}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplateId(null)}
                  className="h-9 text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleUseTemplate(previewTemplateId);
                    setPreviewTemplateId(null);
                  }}
                  className="h-9 text-xs font-semibold bg-primary hover:bg-primary/95 text-white"
                >
                  <span>Use Layout</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
