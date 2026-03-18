import { cn } from "@/lib/utils";

export default function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        —
      </span>
    );
  }

  const classes =
    score >= 7
      ? "bg-[#C7F56F]/20 text-[#3a6600] dark:bg-[#C7F56F]/15 dark:text-[#C7F56F]"
      : score >= 5
      ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
      : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400";

  return (
    <span className={cn(
      "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold",
      classes
    )}>
      {score}
    </span>
  );
}
