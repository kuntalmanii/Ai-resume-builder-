import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary bg-primary-subtle",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-border shadow-sm", className)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground truncate">
            {value}
          </p>
          {description && (
            <p className="text-[11px] text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-4", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default StatCard;
