"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Trash,
  RefreshCw,
  FileText,
  Settings,
  Sparkles,
  Loader2,
  Check,
  LayoutGrid,
  Eye,
  Sliders,
} from "lucide-react";
import { resumesAPI, exportsAPI, getAccessToken } from "@/lib/api";
import type { Resume, ResumeExport } from "@/types";
import Link from "next/link";

// 7 templates configurations mapping to design colors
const ACCENT_OPTIONS = [
  { id: "modern", name: "Blue Accent", color: "#2563eb" },
  { id: "minimal", name: "Slate Dark", color: "#1f2937" },
  { id: "corporate", name: "Navy Blue", color: "#0f172a" },
  { id: "technical", name: "Teal Monospace", color: "#0d9488" },
  { id: "student", name: "Indigo Theme", color: "#4f46e5" },
  { id: "internship", name: "Emerald Theme", color: "#059669" },
  { id: "executive", name: "Amber/Gold Theme", color: "#78350f" },
];

const TEMPLATE_CARDS = [
  { id: "modern", name: "Modern ATS", desc: "Left-aligned, standard clean dividers.", type: "sans" },
  { id: "minimal", name: "Minimal ATS", desc: "Centered title, serif elegance.", type: "serif" },
  { id: "corporate", name: "Corporate", desc: "Classic navy accent structure.", type: "serif" },
  { id: "technical", name: "Technical", desc: "Monospace coding grid format.", type: "mono" },
  { id: "student", name: "Student", desc: "Indigo highlights for academics.", type: "sans" },
  { id: "internship", name: "Internship", desc: "Compact spacing, project-first.", type: "sans" },
  { id: "executive", name: "Executive", desc: "Spacious layout with amber accents.", type: "serif" },
];

interface RenderNodeViewProps {
  node: any;
  accentColor: string;
}

function RenderNodeView({ node, accentColor }: RenderNodeViewProps) {
  if (!node) return null;

  const inlineStyles: Record<string, any> = {};
  if (node.styles) {
    Object.entries(node.styles).forEach(([key, val]) => {
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      inlineStyles[camelKey] = val as string;
    });
  }

  const children = node.children?.map((child: any, idx: number) => (
    <RenderNodeView key={idx} node={child} accentColor={accentColor} />
  )) || null;

  switch (node.type) {
    case "document":
      return (
        <div className={`resume-document ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </div>
      );
    case "section":
      return (
        <section className={`resume-section ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </section>
      );
    case "header":
      return (
        <header className={`resume-header ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </header>
      );
    case "entry":
      return (
        <div className={`resume-entry ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </div>
      );
    case "row":
      return (
        <div className={`resume-row ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </div>
      );
    case "col":
      return (
        <div className={`resume-col ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </div>
      );
    case "grid":
      return (
        <div className={`resume-grid ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {children}
        </div>
      );
    case "divider":
      return (
        <div className={`resume-divider ${node.style_classes?.join(" ") || ""}`} style={inlineStyles} />
      );
    case "item":
      return (
        <div className={`resume-item ${node.style_classes?.join(" ") || ""}`} style={inlineStyles}>
          {node.text}
          {children}
        </div>
      );
    default:
      return (
        <span className={node.style_classes?.join(" ") || ""} style={inlineStyles}>
          {node.text}
          {children}
        </span>
      );
  }
}

export default function ResumeExportPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [resume, setResume] = useState<Resume | null>(null);
  const [exports, setExports] = useState<ResumeExport[]>([]);
  const [renderTree, setRenderTree] = useState<any>(null);

  // Settings states
  const [templateId, setTemplateId] = useState("modern");
  const [accentColor, setAccentColor] = useState("modern");
  const [marginTop, setMarginTop] = useState(15);
  const [fontScale, setFontScale] = useState(1.0);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [atsMode, setAtsMode] = useState(false);

  // Statuses
  const [isPending, startTransition] = useTransition();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState<string | null>(null);

  useEffect(() => {
    // Load resume info & exports history
    const loadData = async () => {
      try {
        const res = await resumesAPI.get(id);
        setResume(res);
        setTemplateId(res.template_id || "modern");
        
        const history = await exportsAPI.list(id);
        setExports(history);
      } catch (err) {
        console.error("Failed to load export workspace data", err);
      }
    };
    loadData();
  }, [id]);

  // Load preview render tree when settings/template changes
  useEffect(() => {
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const settings = {
          accent_color: accentColor,
          margin_top: `${marginTop}mm`,
          margin_bottom: `${marginTop}mm`,
          margin_left: `${marginTop}mm`,
          margin_right: `${marginTop}mm`,
          font_scale: fontScale,
          show_page_numbers: showPageNumbers,
          ats_mode: atsMode,
        };
        const tree = await exportsAPI.preview(id, templateId, settings);
        setRenderTree(tree);
      } catch (err) {
        console.error("Failed to compile layout preview", err);
      } finally {
        setLoadingPreview(false);
      }
    };
    
    // Simple debounce/delay trigger to avoid redundant HTTP requests
    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [id, templateId, accentColor, marginTop, fontScale, showPageNumbers, atsMode]);

  const handleDownload = async (exportId: string, title?: string) => {
    setLoadingDownload(exportId);
    try {
      const url = exportsAPI.getDownloadUrl(exportId);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      if (!res.ok) throw new Error("Network error during file download");
      
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = title ? `${title.replace(/\s+/g, "_")}.pdf` : `Resume_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    } finally {
      setLoadingDownload(null);
    }
  };

  const handleCreateSnapshot = () => {
    startTransition(async () => {
      try {
        const settings = {
          accent_color: accentColor,
          margin_top: `${marginTop}mm`,
          margin_bottom: `${marginTop}mm`,
          margin_left: `${marginTop}mm`,
          margin_right: `${marginTop}mm`,
          font_scale: fontScale,
          show_page_numbers: showPageNumbers,
          ats_mode: atsMode,
        };
        const newExport = await exportsAPI.create(id, templateId, settings, true);
        setExports((prev) => [newExport, ...prev]);
        alert("Snapshot exported successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to create snapshot.");
      }
    });
  };

  const handleDeleteSnapshot = async (exportId: string) => {
    if (!confirm("Are you sure you want to delete this snapshot?")) return;
    try {
      await exportsAPI.delete(exportId);
      setExports((prev) => prev.filter((exp) => exp.id !== exportId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete snapshot.");
    }
  };

  const handleRegenerate = async (exportId: string) => {
    try {
      const regenerated = await exportsAPI.regenerate(exportId);
      setExports((prev) => prev.map((exp) => (exp.id === exportId ? regenerated : exp)));
      alert("Snapshot regenerated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to regenerate snapshot.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Workspace Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href={`/resumes/${id}/edit`}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-500" /> Export & Customize
            </h1>
            <p className="text-xs text-slate-400">
              Style your resume using standard layout configurations and download ATS-safe snapshots.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCreateSnapshot}
            disabled={isPending || loadingPreview}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Save PDF Snapshot
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side styling controls panel */}
        <aside className="w-96 border-r border-slate-800 bg-slate-950 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Templates Grid Selector */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-slate-500" /> 1. Select Template
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {TEMPLATE_CARDS.map((card) => {
                const isSelected = templateId === card.id;
                return (
                  <button
                    key={card.id}
                    onClick={() => {
                      setTemplateId(card.id);
                      setAccentColor(card.id);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-950/20 shadow-inner"
                        : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-slate-100">{card.name}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full font-bold flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Styling Design Tokens panel */}
          <div className="border-t border-slate-800/80 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-slate-500" /> 2. Style Tokens
            </h3>

            <div className="space-y-5">
              {/* ATS Safe Mode Override */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/80">
                <div>
                  <label className="text-sm font-semibold text-slate-200 block">
                    ATS-Safe Override
                  </label>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Strict column formatting & black-and-white print.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={atsMode}
                  onChange={(e) => setAtsMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                />
              </div>

              {/* Accent Color picker */}
              {!atsMode && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-2">
                    Accent Accentuation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAccentColor(opt.id)}
                        className={`w-7 h-7 rounded-full relative transition-transform ${
                          accentColor === opt.id ? "scale-110 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: opt.color }}
                        title={opt.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Margins */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Marginal Paddings</label>
                  <span className="text-xs text-slate-400 font-mono">{marginTop}mm</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={marginTop}
                  onChange={(e) => setMarginTop(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Font scale */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Typography Scale</label>
                  <span className="text-xs text-slate-400 font-mono">{(fontScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={fontScale}
                  onChange={(e) => setFontScale(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Show Page Numbers */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-medium text-slate-300">Add Page Numbers</span>
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Central interactive A4 Preview Area */}
        <main className="flex-1 bg-slate-900 overflow-y-auto p-8 flex justify-center items-start relative">
          {loadingPreview ? (
            <div className="absolute top-6 left-6 z-20 px-3.5 py-2 bg-slate-950/80 backdrop-blur border border-slate-800 text-xs text-slate-300 rounded-full flex items-center gap-2 shadow-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> Compiling layout...
            </div>
          ) : (
            <div className="absolute top-6 left-6 z-20 px-3.5 py-2 bg-slate-950/80 backdrop-blur border border-slate-800 text-xs text-slate-400 rounded-full flex items-center gap-1.5 shadow-xl">
              <Eye className="h-3.5 w-3.5 text-slate-500" /> Unified Preview (A4 Scale)
            </div>
          )}

          {/* Simulated A4 Page frame */}
          <div className="w-[100%] max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-8 min-h-[297mm] transition-all">
            {renderTree ? (
              <RenderNodeView node={renderTree.root} accentColor={renderTree.accent_color} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200mm] text-slate-400 gap-3">
                <FileText className="h-12 w-12 text-slate-600" />
                <span className="text-sm">Compile layout tree to preview.</span>
              </div>
            )}
          </div>
        </main>

        {/* Right Side Historical PDF Snapshots panel */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" /> Export History
          </h3>

          <div className="space-y-3 flex-1">
            {exports.length === 0 ? (
              <div className="text-center p-8 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs leading-relaxed">
                No exports saved yet. Use the top button to compile and archive a snapshot.
              </div>
            ) : (
              exports.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 capitalize block">
                        Template: {exp.template_id}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {new Date(exp.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-[9px] text-slate-400 rounded font-mono">
                      v{exp.resume_version}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                    <span>Pages: <strong className="text-slate-200">{exp.page_count}</strong></span>
                    <span className={`capitalize font-semibold ${
                      exp.status === "completed" ? "text-emerald-500" : "text-amber-500"
                    }`}>
                      {exp.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(exp.id, `${resume?.title || "resume"}_v${exp.resume_version}`)}
                      disabled={loadingDownload === exp.id || exp.status !== "completed"}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-200 hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingDownload === exp.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Download
                    </button>
                    <button
                      onClick={() => handleRegenerate(exp.id)}
                      title="Force regenerate PDF"
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(exp.id)}
                      title="Delete snapshot"
                      className="p-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 hover:border-red-900/80 text-red-400 hover:text-red-200 rounded-lg transition-colors"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
