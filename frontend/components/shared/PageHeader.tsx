"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backLink?: string;
}

export function PageHeader({ title, description, action, backLink }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-border mb-6">
      <div className="flex items-start gap-3">
        {backLink && (
          <Link href={backLink} passHref>
            <Button variant="ghost" size="icon" className="h-9 w-9 p-0 flex-shrink-0 mt-0.5 border border-border" aria-label="Back">
              <ArrowLeft className="w-4.5 h-4.5" />
            </Button>
          </Link>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-3 flex-shrink-0">{action}</div>}
    </div>
  );
}
export default PageHeader;
