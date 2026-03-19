"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Bounce } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BounceResponse {
  bounces: (Bounce & { company?: string })[];
  bounceRate: number;
  sentCount: number;
  bouncedCount: number;
}

export default function BouncesPage() {
  const [data, setData] = useState<BounceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBounces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bounces");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBounces();
  }, [fetchBounces]);

  const rate = data?.bounceRate ?? 0;
  const highBounce = rate > 2;

  return (
    <div className="flex flex-col gap-6">
      {/* High bounce warning */}
      {!loading && highBounce && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>Bounce rate te hoog ({rate}%)</strong> — Controleer de kwaliteit van e-mailadressen. Een hoge bounce rate beschadigt uw verzendreputatie.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Bounces</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Overzicht van teruggestuurde e-mails</p>
        </div>
        <button
          onClick={fetchBounces}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Vernieuwen
        </button>
      </div>

      {/* Stats row */}
      {!loading && data && (
        <div className="flex gap-4">
          <div className={cn(
            "rounded-xl border px-5 py-4 flex flex-col gap-1 min-w-[140px]",
            highBounce
              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          )}>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bounce rate</span>
            <span className={cn(
              "text-3xl font-bold tabular-nums",
              highBounce ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
            )}>
              {rate}%
            </span>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Verzonden</span>
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{data.sentCount}</span>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bounces</span>
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{data.bouncedCount}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : !data || data.bounces.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Geen bounces geregistreerd.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">E-mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bedrijf</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Reden</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.bounces.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{b.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{b.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      b.bounce_type === "hard"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                    )}>
                      {b.bounce_type === "hard" ? "Hard" : "Soft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[280px] truncate">
                    {b.reason ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(b.bounced_at).toLocaleDateString("nl-NL", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
