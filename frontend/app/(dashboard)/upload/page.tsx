"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDropzone, ParsingProgress, ParsingStep } from "@/components/ui/upload-dropzone";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, FileText, AlertCircle } from "lucide-react";

export default function ResumeUploadPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [steps, setSteps] = useState<ParsingStep[]>([
    { label: "Extracting text", status: "pending" },
    { label: "Detecting sections", status: "pending" },
    { label: "Analyzing structure", status: "pending" },
    { label: "Running ATS check", status: "pending" },
    { label: "Generating suggestions", status: "pending" },
  ]);

  const handleFileSelect = (file: File) => {
    // Basic format check
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (extension !== ".pdf" && extension !== ".docx") {
      setErrorMsg("Supported formats are PDF and DOCX only.");
      toast.error("Unsupported file format");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds 10MB limit.");
      toast.error("File is too large");
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);
    setIsUploading(true);
    toast.success(`Uploading "${file.name}"...`);

    // Simulate upload and parsing step-by-step
    setTimeout(() => {
      setIsUploading(false);
      setIsParsing(true);
      runParsingSteps();
    }, 1200);
  };

  const runParsingSteps = () => {
    let currentStep = 0;
    const interval = setInterval(() => {
      setSteps((prev) => {
        const next = [...prev];
        if (currentStep > 0) {
          next[currentStep - 1].status = "done";
        }
        if (currentStep < next.length) {
          next[currentStep].status = "progress";
        }
        return next;
      });

      currentStep++;

      if (currentStep > steps.length) {
        clearInterval(interval);
        setIsParsing(false);
        setIsDone(true);
        toast.success("Resume parsing completed successfully!");
      }
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Upload Resume Document"
        description="Select or drop your PDF/Word resume to parse profile data and evaluate ATS criteria."
        backLink="/resumes"
      />

      <div className="pt-2">
        {!isParsing && !isDone ? (
          <div className="space-y-4">
            <UploadDropzone
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
              error={errorMsg}
            />
            
            <div className="flex items-start gap-2 text-xs text-muted-foreground px-4 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">File Upload Requirements:</p>
                <p>Supported file formats are PDF and Microsoft Word (.docx) formats only. Maximum size: 10MB.</p>
              </div>
            </div>
          </div>
        ) : isParsing ? (
          <ParsingProgress
            steps={steps}
            fileName={uploadedFile?.name}
          />
        ) : (
          <Card className="border border-border shadow-md bg-card p-6 text-center space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
              <h3 className="text-base font-bold text-foreground">Parsing Successfully Completed!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Parsed <strong className="text-foreground">"{uploadedFile?.name}"</strong> and created a new draft profile. You can now analyze the score.
              </p>
            </div>

            <div className="flex justify-center gap-3 border-t border-border/50 pt-5">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-semibold"
                onClick={() => {
                  setUploadedFile(null);
                  setIsDone(false);
                  setSteps(steps.map(s => ({ ...s, status: "pending" })));
                }}
              >
                Upload another
              </Button>
              <Button
                onClick={() => router.push("/resumes/resume-1/analyze")}
                className="h-9 text-xs font-semibold gap-1.5"
              >
                <span>View score</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
