"use client";

import { useState, useEffect } from "react";
import { Globe, Search, Sparkles, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { linkedinAPI, resumesAPI } from "@/lib/api";
import { toast } from "sonner";

interface LinkedInOptimization {
  id: string;
  resume_id: string;
  target_role?: string;
  linkedin_url?: string;
  seo_keywords: string[];
  suggested_headline: string;
  suggested_about: string;
  score: number;
  created_at: string;
}

export default function LinkedInPage() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [history, setHistory] = useState<LinkedInOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<LinkedInOptimization | null>(null);

  // Forms
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [rawProfileText, setRawProfileText] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resList, optList] = await Promise.all([
        resumesAPI.list(),
        linkedinAPI.list()
      ]);
      setResumes(resList);
      setHistory(optList);
      if (resList.length > 0) {
        setSelectedResumeId(resList[0].id);
      }
      if (optList.length > 0) {
        setSelectedOpt(optList[0]);
      }
    } catch (err) {
      toast.error("Failed to load LinkedIn optimizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) {
      toast.error("Please select a resume profile.");
      return;
    }
    try {
      setOptimizing(true);
      const res = await linkedinAPI.optimize({
        resume_id: selectedResumeId,
        target_role: targetRole || undefined,
        linkedin_url: linkedinUrl || undefined,
        raw_profile_text: rawProfileText || undefined,
      });
      toast.success("LinkedIn SEO scan complete!");
      setSelectedOpt(res);
      fetchData();
    } catch (err) {
      toast.error("Failed to optimize profile.");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
            LinkedIn Profile Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">
            Perform SEO keyword audits, scan profile visibility, and rewrite headlines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Scan Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOptimize} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Base Resume Context</label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm text-foreground bg-transparent"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} (v{r.version})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Job Role</label>
                  <Input
                    placeholder="Senior Developer / Product Lead"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">LinkedIn Profile URL</label>
                  <Input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Paste Profile Headline & About Text</label>
                  <Textarea
                    placeholder="Headline: Full-Stack Dev at Acme Corp... About: I build web products..."
                    rows={4}
                    value={rawProfileText}
                    onChange={(e) => setRawProfileText(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={optimizing}>
                  {optimizing ? "Auditing profile..." : "Start LinkedIn SEO Audit"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Audit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No historical audits found.
                </div>
              ) : (
                history.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOpt(opt)}
                    className={`p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/30 transition-all flex items-center justify-between ${
                      selectedOpt?.id === opt.id ? "border-primary bg-primary-subtle text-primary" : "border-border"
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate max-w-[150px]">
                        {opt.target_role || "Profile Scan"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(opt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-bold text-xs bg-muted">
                      Score: {opt.score}/100
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Audit Results column */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOpt ? (
            <div className="space-y-6">
              {/* Score card */}
              <Card className="border border-border relative overflow-hidden bg-card">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">SEO Audit Score</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Your score represents keyword density, headline strength, and recruiter search match probability.
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center text-3xl font-extrabold text-primary">
                      {selectedOpt.score}
                    </div>
                    <span className="text-xs font-semibold mt-2 text-muted-foreground">Match Rating</span>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords audit */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Target SEO Keywords to Include
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedOpt.seo_keywords && selectedOpt.seo_keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Recommended Headline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/30 border border-border p-4 rounded-lg text-sm italic font-medium leading-relaxed">
                      "{selectedOpt.suggested_headline}"
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Copy this into your LinkedIn profile to optimize for algorithmic recruiter searches targeting {selectedOpt.target_role || "this role"}.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Recommended About Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/30 border border-border p-4 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-mono">
                      {selectedOpt.suggested_about}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-96 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
              <AlertCircle className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-foreground text-lg">No audit report loaded</h3>
              <p className="max-w-xs text-xs mt-1">
                Enter your LinkedIn details on the left and run a profile SEO optimization report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
