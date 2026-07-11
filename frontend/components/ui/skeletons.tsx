/**
 * Reusable skeleton loaders matching the exact shape of real content.
 */
"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-[#EFF1F5] rounded-xs", className)} />
  );
}

export function SkeletonResumeCard() {
  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-4 shadow-xs">
      {/* Thumbnail area */}
      <Skeleton className="w-full h-[180px]" />
      
      {/* Title block */}
      <div className="space-y-2">
        <Skeleton className="w-[70%] h-4" />
        <Skeleton className="w-[45%] h-3" />
      </div>

      {/* Score and activity */}
      <div className="flex items-center gap-1.5 pt-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="w-[30%] h-3.5" />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2 border-t border-border-subtle">
        <Skeleton className="w-16 h-[28px]" />
        <Skeleton className="w-20 h-[28px]" />
      </div>
    </div>
  );
}

export function SkeletonAtsRing() {
  return (
    <div className="bg-card border border-border rounded-md p-5 flex flex-col items-center justify-center gap-4 shadow-xs">
      <Skeleton className="w-[120px] h-[120px] rounded-full" />
      <Skeleton className="w-24 h-4" />
      <div className="w-full space-y-3 pt-4 border-t border-border-subtle">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="w-[40%] h-3" />
              <Skeleton className="w-8 h-3" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
