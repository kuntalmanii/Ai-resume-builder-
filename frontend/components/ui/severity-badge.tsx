import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { CheckStatus } from "@/types";

interface SeverityBadgeProps {
  status: CheckStatus;
  className?: string;
}

export function SeverityBadge({ status, className }: SeverityBadgeProps) {
  const getStatusStyles = (val: CheckStatus) => {
    switch (val) {
      case "passed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "warning":
        return "bg-warning-subtle text-amber-600 border-amber-500/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (val: CheckStatus) => {
    switch (val) {
      case "passed":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case "failed":
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (val: CheckStatus) => {
    switch (val) {
      case "passed":
        return "Passed";
      case "warning":
        return "Warning";
      case "failed":
        return "Failed";
      default:
        return val;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border select-none capitalize",
        getStatusStyles(status),
        className
      )}
    >
      {getStatusIcon(status)}
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}
export default SeverityBadge;
