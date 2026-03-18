"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Zap, Mail, Send, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import LeadsTable from "@/components/LeadsTable";
import { Lead, DashboardMetrics } from "@/lib/types";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    leadsToday: 0,
    qualified: 0,
    emailReady: 0,
    sent: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data: Lead[] = await res.json();
      setLeads(data);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      setMetrics({
        leadsToday: data.filter((l) => new Date(l.scraped_at) >= today).length,
        qualified: data.filter((l) => (l.ai_score ?? 0) >= 7).length,
        emailReady: data.filter((l) => l.status === "email_ready").length,
        sent: data.filter((l) => l.status === "sent").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Overzicht van uw lead generation pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Vernieuwen
          </button>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={14} />
            Instellingen
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Leads vandaag"
          value={loading ? "—" : metrics.leadsToday}
          icon={Users}
          accent
        />
        <MetricCard
          label="Gekwalificeerd"
          value={loading ? "—" : metrics.qualified}
          icon={Zap}
        />
        <MetricCard
          label="Email klaar"
          value={loading ? "—" : metrics.emailReady}
          icon={Mail}
        />
        <MetricCard
          label="Verzonden"
          value={loading ? "—" : metrics.sent}
          icon={Send}
        />
      </div>

      {/* Leads table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Leads
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {leads.length} totaal
          </span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 w-fit">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
            Laden…
          </div>
        ) : (
          <LeadsTable leads={leads} onRefresh={fetchData} />
        )}
      </div>
    </div>
  );
}
