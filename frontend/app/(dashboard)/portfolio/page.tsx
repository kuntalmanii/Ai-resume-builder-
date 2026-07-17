"use client";

import { useState, useEffect } from "react";
import { Globe, Shield, RefreshCw, Eye, Sparkles, ExternalLink, Settings2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { portfolioAPI } from "@/lib/api";
import { toast } from "sonner";

interface Portfolio {
  id: string;
  theme: string;
  custom_domain?: string;
  is_published: boolean;
  sections?: any;
  social_links?: any;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Forms
  const [theme, setTheme] = useState("modern_dark");
  const [customDomain, setCustomDomain] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const data = await portfolioAPI.getOrCreate();
      setPortfolio(data);
      setTheme(data.theme);
      setCustomDomain(data.custom_domain || "");
      setIsPublished(data.is_published);
    } catch (err) {
      toast.error("Failed to load portfolio website.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await portfolioAPI.update({
        theme,
        custom_domain: customDomain || undefined,
        is_published: isPublished,
      });
      setPortfolio(updated);
      toast.success("Portfolio configurations updated!");
    } catch (err) {
      toast.error("Failed to update portfolio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
          Personal Portfolio Builder
        </h1>
        <p className="text-muted-foreground mt-1">
          Instantly compile your verified career profile and credentials into a beautiful responsive portfolio site.
        </p>
      </div>

      {loading ? (
        <div className="h-64 border border-border rounded-xl animate-pulse bg-muted/40" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-emerald-500" /> Configurations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Design Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm text-foreground bg-transparent"
                    >
                      <option value="modern_dark">Modern Dark (Glassmorphic)</option>
                      <option value="professional_light">Professional Light (Minimalist)</option>
                      <option value="emerald_tech">Emerald Tech (Developer Focused)</option>
                      <option value="slate_minim">Slate Minimal (Artistic & Clean)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Custom Domain Prefix</label>
                    <div className="flex items-center">
                      <Input
                        placeholder="john-doe"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground font-semibold px-2 bg-muted h-9 flex items-center border border-l-0 border-border rounded-r-md">
                        .careeros.me
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div>
                      <div className="text-sm font-bold">Publish Website</div>
                      <div className="text-[10px] text-muted-foreground">Make portfolio publicly accessible.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                    {saving ? "Saving Configurations..." : "Update Website Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Verified Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-normal">
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-900/40">
                  <Shield className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-400">Profile Verified Sync</span>
                    <p className="text-[11px] text-emerald-700/80 mt-1 dark:text-emerald-400/80">
                      All resume experience entries and credentials marked as "Source Verified" or "User Confirmed" in Evidence Mode are automatically integrated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview sandboxed column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border overflow-hidden flex flex-col h-full bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" /> Website Live Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isPublished ? "default" : "secondary"} className={isPublished ? "bg-emerald-500 text-white" : ""}>
                    {isPublished ? "Publicly Live" : "Private Sandbox"}
                  </Badge>
                  {isPublished && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => window.open(`http://localhost:3000/portfolio-preview?domain=${customDomain}`, "_blank")}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-[450px] p-6 bg-slate-900 text-white rounded-b-xl flex flex-col justify-between font-sans">
                {/* Simulated dynamic theme preview */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <span className="text-sm font-extrabold tracking-wide uppercase text-emerald-400">
                      {customDomain || "john-doe"}.careeros.me
                    </span>
                    <div className="flex gap-3 text-xs text-slate-400 font-medium">
                      <span>Experience</span>
                      <span>Projects</span>
                      <span>Skills</span>
                    </div>
                  </div>

                  {/* Intro */}
                  <div className="space-y-2 mt-6">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      Verified Professional Portfolio
                    </Badge>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                      Hi, I'm a Professional Developer
                    </h2>
                    <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                      I compile scalable backend databases, construct responsive API modules, and launch verified cloud solutions. Verified via CareerOS Evidence Audits.
                    </p>
                  </div>

                  {/* Skills tags */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Core Technical Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {portfolio?.sections?.skills?.items ? (
                        portfolio.sections.skills.items.map((sk: string, idx: number) => (
                          <Badge key={idx} className="bg-slate-800 text-slate-200 border-none">
                            {sk}
                          </Badge>
                        ))
                      ) : (
                        ["React", "Node.js", "Python", "SQL", "Cloud Infrastructure"].map((sk) => (
                          <Badge key={sk} className="bg-slate-800 text-slate-200 border-none">
                            {sk}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 text-center pt-6 border-t border-slate-800/60">
                  Powered by CareerOS verified engine.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
