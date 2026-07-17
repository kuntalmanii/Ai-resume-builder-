"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, Calendar, MapPin, DollarSign, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { applicationsAPI } from "@/lib/api";
import { toast } from "sonner";

const COLUMNS = ["Wishlist", "Applied", "Interviewing", "Offer", "Rejected"];

interface Application {
  id: string;
  company: string;
  role: string;
  location?: string;
  status: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  recruiter_name?: string;
  recruiter_email?: string;
  notes?: string;
  interviews?: any[];
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add form fields
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Wishlist");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [notes, setNotes] = useState("");

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await applicationsAPI.list();
      setApplications(data);
    } catch (err: any) {
      toast.error("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) {
      toast.error("Company and Role are required.");
      return;
    }
    try {
      const payload: any = {
        company,
        role,
        status,
        location: location || undefined,
        notes: notes || undefined,
      };
      if (salaryMin) payload.salary_min = parseFloat(salaryMin);
      if (salaryMax) payload.salary_max = parseFloat(salaryMax);
      
      await applicationsAPI.create(payload);
      toast.success("Job application tracked!");
      setShowAddModal(false);
      // Reset form
      setCompany("");
      setRole("");
      setLocation("");
      setStatus("Wishlist");
      setSalaryMin("");
      setSalaryMax("");
      setNotes("");
      fetchApplications();
    } catch (err) {
      toast.error("Failed to track application.");
    }
  };

  const handleMove = async (appId: string, currentStatus: string, direction: "next" | "prev") => {
    const currentIndex = COLUMNS.indexOf(currentStatus);
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;
    const nextStatus = COLUMNS[nextIndex];
    try {
      await applicationsAPI.updateStatus(appId, nextStatus);
      toast.success(`Moved to ${nextStatus}`);
      fetchApplications();
    } catch (err) {
      toast.error("Failed to move application status.");
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      await applicationsAPI.delete(appId);
      toast.success("Application deleted.");
      fetchApplications();
    } catch (err) {
      toast.error("Failed to delete application.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            Applications Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your job hunt pipeline status and schedule interviews.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Application
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {COLUMNS.map((colName) => {
            const colApps = applications.filter((a) => a.status === colName);
            return (
              <div key={colName} className="bg-card/40 backdrop-blur-md rounded-xl p-4 border border-border/80 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground text-sm tracking-wide uppercase">
                    {colName}
                  </h3>
                  <Badge variant="secondary" className="font-bold text-xs bg-muted text-muted-foreground">
                    {colApps.length}
                  </Badge>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colApps.length === 0 ? (
                    <div className="h-28 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground/80">
                      Empty column
                    </div>
                  ) : (
                    colApps.map((app) => (
                      <Card key={app.id} className="shadow-sm hover:shadow-md transition-shadow border border-border bg-card">
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-1">{app.role}</h4>
                            <p className="text-xs text-muted-foreground font-semibold">{app.company}</p>
                          </div>

                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            {app.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-muted-foreground/75" />
                                <span className="truncate">{app.location}</span>
                              </div>
                            )}
                            {(app.salary_min || app.salary_max) && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3 text-emerald-500" />
                                <span>
                                  {app.salary_min ? `${app.salary_min.toLocaleString()}` : ""}{" "}
                                  {app.salary_max ? `- ${app.salary_max.toLocaleString()}` : ""}{" "}
                                  {app.currency || "USD"}
                                </span>
                              </div>
                            )}
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(app.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={COLUMNS.indexOf(colName) === 0}
                                onClick={() => handleMove(app.id, colName, "prev")}
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={COLUMNS.indexOf(colName) === COLUMNS.length - 1}
                                onClick={() => handleMove(app.id, colName, "next")}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-xl">Track New Application</CardTitle>
            </CardHeader>
            <form onSubmit={handleAdd}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Company *</label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Netflix" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Role *</label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Frontend Engineer" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Location</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote / Los Gatos, CA" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Salary Min</label>
                    <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="120000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Salary Max</label>
                    <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="180000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm text-foreground bg-transparent"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Notes</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referred by engineering manager." />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Track Job</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
