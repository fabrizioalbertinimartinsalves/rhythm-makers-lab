import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FinancialCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export const FinancialCard = ({
  label,
  value,
  icon: Icon,
  trend,
  trendType = "neutral",
  variant = "default",
  className,
}: FinancialCardProps) => {
  const variantStyles = {
    default: "bg-white ring-slate-100",
    success: "bg-white ring-emerald-100",
    warning: "bg-white ring-amber-100",
    danger: "bg-white ring-rose-100",
    info: "bg-white ring-sky-100",
  };

  const iconStyles = {
    default: "bg-slate-50 text-slate-500",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
    info: "bg-sky-50 text-sky-600",
  };

  return (
    <Card className={cn(
      "border-none shadow-sm rounded-xl overflow-hidden ring-1 transition-all hover:shadow-md",
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", iconStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 truncate">
              {label}
            </p>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              {value}
            </h3>
            {trend && (
              <p className={cn(
                "text-[10px] font-bold mt-0.5",
                trendType === "up" ? "text-emerald-600" : trendType === "down" ? "text-rose-600" : "text-slate-400"
              )}>
                {trend}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
