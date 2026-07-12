import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Button } from "./button";
import { Edit2, Plus } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  onActionClick?: () => void;
  actionType?: "edit" | "add" | "custom";
  actionLabel?: string;
  customAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  onActionClick,
  actionType = "edit",
  actionLabel,
  customAction,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn("border border-border shadow-sm", className)}>
      <CardHeader className="p-5 flex flex-row items-start justify-between gap-4 border-b border-border/50 bg-muted/20">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>

        {customAction ? (
          customAction
        ) : onActionClick ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onActionClick}
            className="h-8 text-xs font-semibold border-border hover:bg-muted/50 gap-1.5 flex-shrink-0"
          >
            {actionType === "edit" ? (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                <span>{actionLabel || "Edit"}</span>
              </>
            ) : actionType === "add" ? (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{actionLabel || "Add"}</span>
              </>
            ) : (
              <span>{actionLabel}</span>
            )}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
export default SectionCard;
