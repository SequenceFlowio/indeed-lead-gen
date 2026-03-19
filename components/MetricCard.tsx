import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: boolean;
  danger?: boolean;
  delta?: string;
}

export default function MetricCard({ label, value, icon: Icon, accent, danger, delta }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-5 flex flex-col gap-3",
      danger
        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
        : accent
        ? "border-[#C7F56F]/40 bg-[#C7F56F]/5 dark:bg-[#C7F56F]/5"
        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
        <div className={cn(
          "rounded-lg p-1.5",
          danger
            ? "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
            : accent
            ? "bg-[#C7F56F]/20 text-[#1a1a1a] dark:text-[#C7F56F]"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
        )}>
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={cn(
          "text-3xl font-bold tabular-nums",
          danger ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
        )}>
          {value}
        </span>
        {delta && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">{delta}</span>
        )}
      </div>
    </div>
  );
}
