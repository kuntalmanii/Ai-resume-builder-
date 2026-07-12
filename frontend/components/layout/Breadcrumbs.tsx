"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
    return null;
  }

  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  const getBreadcrumbName = (segment: string, index: number) => {
    // Dynamic mapping for descriptive path names
    if (segment.toLowerCase() === "dashboard") return "Dashboard";
    if (segment.toLowerCase() === "resumes") return "My Resumes";
    if (segment.toLowerCase() === "new") return "Create Resume";
    if (segment.toLowerCase() === "career-profile") return "Career Profile";
    if (segment.toLowerCase() === "templates") return "Templates";
    if (segment.toLowerCase() === "settings") return "Settings";
    if (segment.toLowerCase() === "upload") return "Upload Resume";
    if (segment.toLowerCase() === "edit") return "Edit";
    if (segment.toLowerCase() === "analyze") return "ATS Analysis";
    if (segment.toLowerCase() === "match") return "JD Matcher";
    if (segment.toLowerCase() === "improve") return "AI Suggestions";

    // Fallback if segment is a dynamic resume ID (uuid or resume-1 pattern)
    if (segment.startsWith("resume-") || segment.length > 20) {
      return "Resume Overview";
    }

    // Capitalize fallback
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors py-1"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {pathSegments.map((segment, index) => {
        const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const name = getBreadcrumbName(segment, index);

        // Don't link dynamic IDs or action words that depend on dynamic IDs directly if they're not useful standalone paths
        const isClickable = !isLast && !segment.startsWith("resume-") && segment.length <= 20;

        return (
          <div key={url} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
            {isClickable ? (
              <Link href={url} className="hover:text-foreground transition-colors py-1 truncate max-w-[120px] sm:max-w-none">
                {name}
              </Link>
            ) : (
              <span className={cn("py-1 truncate max-w-[120px] sm:max-w-none", isLast && "text-foreground font-semibold")}>
                {name}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
