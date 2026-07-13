"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Edit, Upload, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resumesAPI } from "@/lib/api";
import { toast } from "sonner";

export default function NewResumePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartFromScratch = async () => {
    try {
      setIsCreating(true);
      const res = await resumesAPI.create({
        title: "Untitled Resume",
        template_id: "modern",
        source_type: "scratch",
      });
      toast.success("Resume draft created!");
      router.push(`/resumes/${res.id}/edit`);
    } catch {
      toast.error("Failed to initialize new resume draft.");
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Create New Resume"
        description="Choose a starting path to build your targeted resume with AI evidence validation."
        backLink="/resumes"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Option 1: Scratch */}
        <Card className="flex flex-col h-full border border-border shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 group">
          <CardHeader className="p-6 pb-4">
            <div className="w-12 h-12 rounded-lg bg-primary-subtle text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Edit className="w-6 h-6" />
            </div>
            <CardTitle className="text-base font-bold">Start from Scratch</CardTitle>
            <CardDescription className="text-xs">
              Enter your details manually using our structured builder sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 mt-auto">
            <Button
              onClick={handleStartFromScratch}
              disabled={isCreating}
              className="w-full text-xs font-semibold gap-1.5 h-9 bg-primary hover:bg-primary/95 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Start building</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Option 2: Upload */}
        <Card className="flex flex-col h-full border border-border shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 group">
          <CardHeader className="p-6 pb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <CardTitle className="text-base font-bold">Import Existing PDF/Word</CardTitle>
            <CardDescription className="text-xs">
              Upload your current resume. Our AI parser will extract your profile data automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 mt-auto">
            <Link href="/upload" passHref>
              <Button className="w-full text-xs font-semibold gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-600/95 text-white border-0">
                <span>Upload file</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Option 3: Choose Template */}
        <Card className="flex flex-col h-full border border-border shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 group">
          <CardHeader className="p-6 pb-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <CardTitle className="text-base font-bold">Start with a Template</CardTitle>
            <CardDescription className="text-xs">
              Pick from our collection of ATS-safe corporate, modern, or minimal layout templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 mt-auto">
            <Link href="/templates" passHref>
              <Button className="w-full text-xs font-semibold gap-1.5 h-9 bg-amber-600 hover:bg-amber-600/95 text-white border-0">
                <span>Browse templates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
