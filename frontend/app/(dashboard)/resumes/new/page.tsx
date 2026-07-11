/**
 * Fullscreen Interactive Resume Builder Workspace.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/shared/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KeywordGrid } from "@/components/ui/keyword-chips";
import { SuggestionCard, Suggestion } from "@/components/ui/suggestion-card";
import { EvidencePanel, EvidenceItem } from "@/components/ui/evidence-panel";
import { ExportModal } from "@/components/ui/export-modal";
import { TemplateSelector } from "@/components/ui/template-selector";
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  GripVertical, 
  PanelRightClose, 
  PanelRightOpen, 
  FileDown, 
  Layout, 
  Wand2,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export default function NewResumeWorkspace() {
  // Resume Editable State
  const [fullName, setFullName] = useState("John Smith");
  const [jobTitle, setJobTitle] = useState("Product Manager");
  const [email, setEmail] = useState("john.smith@example.com");
  const [location, setLocation] = useState("San Francisco, CA");
  const [summary, setSummary] = useState(
    "Experienced Product Manager with a track record of driving cross-functional development teams to build scale products."
  );
  
  const [bullets, setBullets] = useState([
    "Worked on frontend development.",
    "Led cross-functional sprint planning and product design workshops.",
  ]);

  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState("classic");

  // UI Panels toggles
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Active AI suggestion context
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion>({
    id: "suggestion-1",
    originalText: "Worked on frontend development.",
    suggestedText: "Developed responsive React interfaces and integrated REST APIs for dynamic data rendering.",
    confidence: 94,
    unverifiedClaim: undefined,
    evidence: [
      { item: "React", source: "resume" },
      { item: "REST APIs", source: "profile" },
      { item: "Responsive UI", source: "resume" },
    ],
  });

  // Current active bullet index for AI suggestion
  const [activeBulletIdx, setActiveBulletIdx] = useState(0);

  const handleEnhanceBullet = (idx: number) => {
    setActiveBulletIdx(idx);
    if (idx === 0) {
      setActiveSuggestion({
        id: "suggestion-1",
        originalText: bullets[0],
        suggestedText: "Developed responsive React interfaces and integrated REST APIs for dynamic data rendering.",
        confidence: 94,
        unverifiedClaim: undefined,
        evidence: [
          { item: "React", source: "resume" as const },
          { item: "REST APIs", source: "profile" as const },
          { item: "Responsive UI", source: "resume" as const },
        ],
      });
    } else {
      // Simulate unverified metric claim trigger
      setActiveSuggestion({
        id: "suggestion-2",
        originalText: bullets[1],
        suggestedText: "Led cross-functional design workshops, improving roadmap delivery velocity by 40%.",
        confidence: 76,
        unverifiedClaim: "40% improvement",
        evidence: [
          { item: "design workshops", source: "resume" as const },
          { item: "delivery velocity", source: "inference" as const },
        ],
      });
    }
    setIsAiPanelOpen(true);
    toast.info("AI suggestion updated based on selected bullet point");
  };

  const handleAcceptAi = (id: string, text: string) => {
    const updated = [...bullets];
    updated[activeBulletIdx] = text;
    setBullets(updated);
    toast.success("AI suggestion applied to resume");
  };

  const handleEditAi = (id: string) => {
    toast.info("Opening inline suggestion editor...");
  };

  const handleRejectAi = (id: string) => {
    toast.error("Suggestion discarded");
  };

  const handleAddBullet = () => {
    setBullets([...bullets, "New resume point description."]);
  };

  const handleDeleteBullet = (idx: number) => {
    setBullets(bullets.filter((_, i) => i !== idx));
  };

  const handleExportAction = async (format: "pdf" | "docx", fileName: string) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        toast.success(`Exported successfully as ${fileName}`);
        resolve();
      }, 1500);
    });
  };

  const evidenceItemsList: EvidenceItem[] = [
    { type: "resume", title: "FROM YOUR RESUME (Section: Projects)", content: "Built React dashboard for internal operations." },
    { type: "profile", title: "FROM YOUR CAREER PROFILE", content: "Skills: REST APIs, Node.js, Agile Methodology" }
  ];

  if (activeSuggestion.unverifiedClaim) {
    evidenceItemsList.push({
      type: "unverified",
      title: "UNVERIFIED CLAIM DETECTED",
      content: '"40% improvement" — This specific metric was not found in your current resume or career profile.'
    });
  }

  return (
    <div className="fixed inset-0 bg-[#F8F9FB] flex flex-col z-50">
      {/* Workspace Header */}
      <Header
        initialTitle="Product Manager 2024"
        onSave={() => toast.success("Resume saved successfully")}
        onExport={() => setIsExportOpen(true)}
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Form Editor (520px) */}
        <div className="w-[520px] shrink-0 border-r border-border bg-card flex flex-col h-full overflow-y-auto">
          {/* Editor Header Section */}
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Resume Sections
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-border"
              onClick={() => toast.info("Re-analyzing ATS compatibility...")}
            >
              <Wand2 className="w-3.5 h-3.5" />
              ATS Scan
            </Button>
          </div>

          <div className="p-5 space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Personal Information
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-[36px] bg-[#F1F3F6] border border-border rounded-sm px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full h-[36px] bg-[#F1F3F6] border border-border rounded-sm px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[36px] bg-[#F1F3F6] border border-border rounded-sm px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-[36px] bg-[#F1F3F6] border border-border rounded-sm px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Professional Summary
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-[#F1F3F6] border border-border rounded-sm p-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            {/* Experience */}
            <div className="space-y-4 border-t border-border-subtle pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Work Experience
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary border-0" onClick={() => toast.info("Add new role")}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {/* Collapsible card mockup */}
              <div className="border border-border rounded-md p-4 bg-[#F1F3F6]/50 space-y-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-text-muted cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">Product Manager</h4>
                    <p className="text-[10px] text-muted-foreground">Acme Corp · Jan 2021 – Present</p>
                  </div>
                </div>

                {/* Bullets editor lists */}
                <div className="space-y-3">
                  {bullets.map((bullet, idx) => (
                    <div key={idx} className="flex gap-2 group items-start">
                      <div className="flex-1 relative">
                        <textarea
                          rows={2}
                          value={bullet}
                          onChange={(e) => {
                            const updated = [...bullets];
                            updated[idx] = e.target.value;
                            setBullets(updated);
                          }}
                          className="w-full bg-[#F1F3F6] border border-border rounded-sm p-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none pr-10"
                        />
                        <button
                          onClick={() => handleEnhanceBullet(idx)}
                          className="absolute right-2 top-2 p-1.5 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary transition-all border-0 cursor-pointer"
                          title="Improve with AI"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBullet(idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-error border-0 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    onClick={handleAddBullet}
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add bullet point
                  </Button>
                </div>
              </div>
            </div>

            {/* Template Selector display */}
            <div className="space-y-3 border-t border-border-subtle pt-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Select Layout Template
              </span>
              <TemplateSelector
                templates={[
                  { id: "classic", name: "Classic Serif", description: "Standard corporate standard" },
                  { id: "modern", name: "Modern AI", description: "Visual priority and spacing rules" },
                  { id: "minimal", name: "Minimalist", description: "Crisp black and white spacing" },
                ]}
                selectedId={selectedTemplate}
                onSelect={(id) => {
                  setSelectedTemplate(id);
                  toast.success(`Switched to "${id}" template`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Middle: Live A4 Preview (Sticky scroll container) */}
        <div className="flex-1 bg-[#EFF1F5] overflow-y-auto p-8 flex justify-center items-start">
          <div 
            className="w-[794px] h-[1123px] bg-white shadow-lg rounded-xs p-12 flex flex-col gap-6 relative"
            style={{
              fontFamily: selectedTemplate === "classic" ? "Georgia, serif" : "var(--font-sans)",
            }}
          >
            {/* Template layout rendering */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-black uppercase">
                {fullName || "John Smith"}
              </h1>
              <p className="text-xs text-black/60 italic font-medium">
                {jobTitle} · {location} · {email}
              </p>
            </div>

            <hr className="border-t border-black/10" />

            {/* Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold tracking-wider text-black uppercase border-b border-black/10 pb-0.5">
                Summary
              </h3>
              <p className="text-xs text-black/80 leading-relaxed text-justify">
                {summary}
              </p>
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-black uppercase border-b border-black/10 pb-0.5">
                Experience
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black">Product Manager</span>
                  <span className="text-xs text-black/70">Jan 2021 – Present</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-black/70">
                  <span>Acme Corp</span>
                  <span>San Francisco, CA</span>
                </div>
                
                <ul className="list-disc pl-4 space-y-1">
                  {bullets.map((bullet, idx) => (
                    <li key={idx} className="text-xs text-black/80 leading-relaxed text-justify">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Watermark overlay indicating mockup */}
            <div className="absolute bottom-4 right-4 pointer-events-none select-none">
              <span className="text-[10px] font-bold tracking-widest text-black/10 uppercase">
                Live A4 Draft
              </span>
            </div>
          </div>
        </div>

        {/* Right Collapsible AI Assistant Panel (360px) */}
        {isAiPanelOpen ? (
          <div className="w-[360px] shrink-0 border-l border-border bg-card flex flex-col h-full overflow-y-auto">
            <div className="h-[56px] border-b border-border px-4 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                AI Assistant
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsAiPanelOpen(false)}
                aria-label="Collapse panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-5">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Keyword Audit
                </span>
                <KeywordGrid
                  keywords={[
                    { label: "React", type: "exact" },
                    { label: "REST APIs", type: "semantic", semanticDetail: "Semantically matched to 'integrated network calls'" },
                    { label: "PostgreSQL", type: "exact" },
                    { label: "TypeScript", type: "missing" },
                    { label: "Docker", type: "missing" },
                  ]}
                  onAddKeyword={(lbl) => {
                    toast.success(`Keyword "${lbl}" added to profile tags`);
                  }}
                />
              </div>

              {/* Comparison card */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Active Bullet Enhancement
                </span>
                <SuggestionCard
                  suggestion={activeSuggestion}
                  onAccept={handleAcceptAi}
                  onEdit={handleEditAi}
                  onReject={handleRejectAi}
                  onVerifyClaim={() => setIsEvidenceOpen(true)}
                  onRemoveClaim={() => {
                    setActiveSuggestion({
                      ...activeSuggestion,
                      unverifiedClaim: undefined,
                      suggestedText: activeSuggestion.suggestedText.split(",")[0] + "."
                    });
                    toast.success("Unverified claim removed");
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAiPanelOpen(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center shadow-lg border-0 z-30 cursor-pointer animate-in fade-in duration-200"
            title="Expand AI panel"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
        )}

      </div>

      {/* Slide-in Evidence Panel */}
      <EvidencePanel
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        evidenceItems={evidenceItemsList}
      />

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onResumeTitle="Product Manager 2024"
        onExport={handleExportAction}
      />
    </div>
  );
}
