import { cn } from "@/lib/utils";
import { LeadStatus } from "@/lib/types";

const config: Record<LeadStatus, { label: string; classes: string }> = {
  new: {
    label: "Nieuw",
    classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  qualified: {
    label: "Gekwalificeerd",
    classes: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  email_ready: {
    label: "Email klaar",
    classes: "bg-[#C7F56F]/15 text-[#4a7a00] dark:bg-[#C7F56F]/10 dark:text-[#C7F56F]",
  },
  sent: {
    label: "Verzonden",
    classes: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  rejected: {
    label: "Afgewezen",
    classes: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  },
  bounced_hard: {
    label: "Hard bounce",
    classes: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  bounced_soft: {
    label: "Soft bounce",
    classes: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
};

export default function StatusBadge({ status }: { status: LeadStatus | string }) {
  const { label, classes } = config[status as LeadStatus] ?? config.new;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", classes)}>
      {label}
    </span>
  );
}
