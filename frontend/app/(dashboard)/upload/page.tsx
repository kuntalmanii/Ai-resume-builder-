"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDropzone, ParsingProgress, ParsingStep } from "@/components/ui/upload-dropzone";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { resumeImportsAPI } from "@/lib/api";

export default function ResumeUploadPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [steps, setSteps] = useState<ParsingStep[]>([
    { label: "Validating file metadata", status: "pending" },
    { label: "Uploading file securely", status: "pending" },
    { label: "Extracting text content", status: "pending" },
    { label: "Parsing structured sections", status: "pending" },
  ]);

  const updateStepStatus = (index: number, status: ParsingStep["status"]) => {
    setSteps((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next[index].status = status;
      }
      return next;
    });
  };

  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);
    setUploadedFile(file);
    setIsUploading(true);

    // Step 1: Client side validation
    updateStepStatus(0, "progress");
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (extension !== ".pdf" && extension !== ".docx") {
      updateStepStatus(0, "error");
      setErrorMsg("Supported formats are PDF and DOCX only.");
      toast.error("Unsupported file format");
      setIsUploading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      updateStepStatus(0, "error");
      setErrorMsg("File size exceeds 10MB limit.");
      toast.error("File is too large");
      setIsUploading(false);
      return;
    }
    updateStepStatus(0, "done");

    // Step 2: Uploading & parsing (Synchronously handled by backend)
    updateStepStatus(1, "progress");
    updateStepStatus(2, "progress");
    updateStepStatus(3, "progress");

    try {
      const session = await resumeImportsAPI.upload(file);
      
      updateStepStatus(1, "done");
      updateStepStatus(2, "done");
      updateStepStatus(3, "done");
      
      toast.success("Resume uploaded and parsed successfully!");
      
      // Redirect to review page after a brief delay
      setTimeout(() => {
        router.push(`/upload/${session.id}/review`);
      }, 800);

    } catch (err: any) {
      // Mark active step as error
      updateStepStatus(1, "error");
      updateStepStatus(2, "error");
      updateStepStatus(3, "error");

      const message = err.message || "Failed to process and parse resume.";
      setErrorMsg(message);
      toast.error(message);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Upload Resume Document"
        description="Select or drop your PDF/Word resume to parse profile data and evaluate ATS criteria."
        backLink="/resumes"
      />

      <div className="pt-2">
        {!isUploading ? (
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
        ) : (
          <ParsingProgress
            steps={steps}
            fileName={uploadedFile?.name}
          />
        )}
      </div>
    </div>
  );
}
