"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Zap, Mail, Send, RefreshCw, Settings, PlayCircle, AlertTriangle, Clock } from "lucide-react";
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
    bounceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ inserted?: number; scraped?: number; error?: string } | null>(null);
  const [bounceRate, setBounceRate] = useState(0);
  const [nextScrapeAt, setNextScrapeAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data: Lead[] = await res.json();
      setLeads(data);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sent = data.filter((l) => l.status === "sent").length;
      const bounced = data.filter((l) => l.status === "bounced_hard" || l.status === "bounced_soft").length;
      const rate = sent > 0 ? (bounced / sent) * 100 : 0;
      setBounceRate(parseFloat(rate.toFixed(1)));

      setMetrics({
        leadsToday: data.filter((l) => new Date(l.scraped_at) >= today).length,
        qualified: data.filter((l) => (l.ai_score ?? 0) >= 7).length,
        emailReady: data.filter((l) => l.status === "email_ready").length,
        sent,
        bounceRate: parseFloat(rate.toFixed(1)),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextScrape = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/schedule");
      if (res.ok) {
        const data = await res.json();
        setNextScrapeAt(data.next_scrape_at ?? null);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNextScrape();
  }, [fetchData, fetchNextScrape]);

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScrapeResult({ inserted: data.inserted, scraped: data.scraped });
        await fetchData();
        await fetchNextScrape();
      } else {
        setScrapeResult({ error: data.error ?? "Scrapen mislukt" });
      }
    } catch {
      setScrapeResult({ error: "Verbindingsfout" });
    } finally {
      setScraping(false);
    }
  }

  function formatNextScrape(iso: string): string {
    const next = new Date(iso);
    const now = new Date();
    const diffMs = next.getTime() - now.getTime();
    if (diffMs <= 0) return "Binnenkort";
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH > 0) return `over ${diffH}u ${diffM}m`;
    return `over ${diffM}m`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bounce rate warning banner */}
      {bounceRate > 2 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>Hoge bounce rate: {bounceRate}%</strong> — Meer dan 2% van verzonden e-mails stuitert terug.{" "}
            <Link href="/bounces" className="underline hover:no-underline">Bekijk bounces</Link>
          </span>
        </div>
      )}

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
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-60"
          >
            <PlayCircle size={14} className={scraping ? "animate-pulse" : ""} />
            {scraping ? "Scrapen…" : "Scrapen"}
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

      {/* Scrape result feedback */}
      {scrapeResult && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-fit ${
          scrapeResult.error
            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            : "bg-[#C7F56F]/10 text-[#3a6600] dark:text-[#C7F56F] border border-[#C7F56F]/30"
        }`}>
          {scrapeResult.error
            ? `Fout: ${scrapeResult.error}`
            : `Scrapen klaar — ${scrapeResult.inserted} nieuw van ${scrapeResult.scraped} gevonden`}
        </div>
      )}

      {/* Next scrape indicator */}
      {nextScrapeAt && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Clock size={12} />
          Volgende automatische scrape: {formatNextScrape(nextScrapeAt)}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
        <MetricCard
          label="Bounce rate"
          value={loading ? "—" : `${bounceRate}%`}
          icon={AlertTriangle}
          danger={bounceRate > 2}
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
