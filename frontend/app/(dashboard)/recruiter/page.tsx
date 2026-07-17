"use client";

import { useState, useEffect } from "react";
import { Users, ShieldCheck, CheckCircle2, AlertTriangle, FileText, Search, Loader2, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { recruiterAPI } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface Candidate {
  id: string;
  full_name: string;
  credibility_score: number;
  primary_resume_id?: string;
}

export default function RecruiterPage() {
  const { user } = useAuthStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [auditsData, setAuditsData] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const data = await recruiterAPI.listCandidates(searchQuery || undefined);
      setCandidates(data);
    } catch (err: any) {
      if (err.status === 403) {
        toast.error("Access denied. Candidates directory is restricted to recruiters only.");
      } else {
        toast.error("Failed to load candidates registry.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [searchQuery]);

  const handleSelectCandidate = async (cand: Candidate) => {
    setSelectedCandidate(cand);
    try {
      setLoadingProfile(true);
      const profile = await recruiterAPI.getCandidateProfile(cand.id);
      setProfileData(profile);

      if (cand.primary_resume_id) {
        const audits = await recruiterAPI.getCandidateAudits(cand.primary_resume_id);
        setAuditsData(audits);
      } else {
        setAuditsData([]);
      }
    } catch (err) {
      toast.error("Failed to load candidate verified profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // Recruiter Access Guard check (Role Verification)
  const isRecruiter = user?.role === "recruiter";

  if (!isRecruiter) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-rose-500 mb-3" />
        <h1 className="text-2xl font-extrabold text-foreground">Access Restricted Portal</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          The Recruiter Candidates registry and verified audits workspace is only accessible to recruiters holding certified credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-indigo-600 to-primary bg-clip-text text-transparent">
            Recruiter Candidate Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Perform credibility checks and audit candidate experience claims grounded on real evidence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates registry list */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border">
            <CardHeader className="p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Candidates Grid</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="h-64 rounded-xl animate-pulse bg-muted/40" />
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {candidates.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No candidates found.
                    </div>
                  ) : (
                    candidates.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectCandidate(cand)}
                        className={`p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/30 transition-all flex items-center justify-between ${
                          selectedCandidate?.id === cand.id ? "border-primary bg-primary-subtle text-primary" : "border-border"
                        }`}
                      >
                        <div>
                          <div className="font-bold">{cand.full_name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            ID: {cand.id.slice(0, 8)}...
                          </div>
                        </div>
                        <Badge className="bg-emerald-500 font-extrabold text-[10px] text-white">
                          Cred: {cand.credibility_score}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Candidate details audits */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCandidate ? (
            loadingProfile ? (
              <div className="h-96 border border-border rounded-xl animate-pulse bg-muted/40" />
            ) : (
              <div className="space-y-6">
                {/* Candidate Overview */}
                <Card className="border border-border">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/5">
                    <div>
                      <h2 className="text-xl font-bold">{selectedCandidate.full_name}</h2>
                      <p className="text-xs text-rose-500 font-semibold mt-1">
                        🔒 Contact details hidden (Anti-bias Mode Enabled)
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center text-xl font-extrabold text-emerald-500">
                        {selectedCandidate.credibility_score}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Credibility score</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Details */}
                {profileData && (
                  <Card className="border border-border">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">Verified Career Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profileData.headline && (
                        <div className="text-sm font-semibold italic text-slate-700 dark:text-slate-300">
                          "{profileData.headline}"
                        </div>
                      )}
                      
                      {profileData.skills && (
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Skills Matrix</span>
                          <div className="flex flex-wrap gap-1.5">
                            {profileData.skills.map((s: string) => (
                              <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Audits & Claims */}
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Grounded Claims Evidence Audits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {auditsData.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-6 text-center">
                        No active claims audits found for this candidate's resume.
                      </div>
                    ) : (
                      auditsData.map((audit) => (
                        <div key={audit.id} className="space-y-3 p-4 border border-border rounded-xl bg-card">
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
                            <div>
                              <span className="font-bold text-foreground">Audit ID:</span> {audit.id.slice(0, 8)}...
                            </div>
                            <Badge className="bg-primary text-primary-foreground font-bold text-[9px] uppercase">
                              v{audit.resume_version} Snapshot
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Extracted Claims & Validation</span>
                            
                            {audit.claims && audit.claims.length === 0 ? (
                              <div className="text-xs italic text-muted-foreground">No claims audited.</div>
                            ) : (
                              audit.claims.map((cl: any) => (
                                <div key={cl.id} className="p-3 border border-border/80 rounded-lg space-y-2 text-xs">
                                  <div className="flex justify-between items-center font-bold">
                                    <span className="text-foreground leading-snug">{cl.claim_text}</span>
                                    <Badge variant={cl.support_status === "supported" ? "default" : "outline"} className={cl.support_status === "supported" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-rose-200 text-rose-700 bg-rose-50"}>
                                      {cl.support_status}
                                    </Badge>
                                  </div>

                                  {cl.fingerprint && (
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      Fingerprint (SHA-256): {cl.fingerprint.slice(0, 16)}...
                                    </div>
                                  )}

                                  {cl.sources && cl.sources.length > 0 && (
                                    <div className="p-2.5 bg-muted/30 border border-border/50 rounded-md text-[10px] space-y-1 text-slate-600 dark:text-slate-300">
                                      <span className="font-bold text-foreground">Supporting Source Excerpt:</span>
                                      <p className="italic leading-normal">"{cl.sources[0].excerpt}"</p>
                                      <span className="block font-semibold text-primary mt-1">Source: {cl.sources[0].label} ({cl.sources[0].source_type})</span>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          ) : (
            <div className="h-96 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground p-6 bg-card/10 backdrop-blur-md">
              <Users className="w-12 h-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-foreground text-lg">No candidate selected</h3>
              <p className="max-w-xs text-xs mt-1">
                Select a candidate on the left to verify their career profile highlights and run evidence audit checks.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
