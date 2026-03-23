"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, Zap, Mail, Send, RefreshCw, Settings, PlayCircle, AlertTriangle, Clock, Building2, ExternalLink, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KVKCompany, KVKStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";

export default function KVKDashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<KVKCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ inserted?: number; scraped?: number; queries?: number; errors?: string[]; error?: string } | null>(null);
  const [nextScrapeAt, setNextScrapeAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | KVKStatus>("all");
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kvk/companies");
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextScrape = useCallback(async () => {
    try {
      const res = await fetch("/api/kvk/settings/schedule");
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
      const res = await fetch("/api/kvk/scrape", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScrapeResult({ inserted: data.inserted, scraped: data.scraped, queries: data.queries, errors: data.errors });
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

  const [countdownLabel, setCountdownLabel] = useState<string>("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function computeCountdown(iso: string): string {
    const diffMs = new Date(iso).getTime() - Date.now();
    if (diffMs <= 0) return "Binnenkort";
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffS = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (diffH > 0) return `over ${diffH}u ${diffM}m`;
    if (diffM > 0) return `over ${diffM}m ${diffS}s`;
    return `over ${diffS}s`;
  }

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!nextScrapeAt) { setCountdownLabel(""); return; }
    setCountdownLabel(computeCountdown(nextScrapeAt));
    countdownRef.current = setInterval(() => {
      setCountdownLabel(computeCountdown(nextScrapeAt));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [nextScrapeAt]);

  const STATUS_TABS: { key: "all" | KVKStatus; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "new", label: "Nieuw" },
    { key: "qualified", label: "Gekwalificeerd" },
    { key: "email_ready", label: "Email klaar" },
    { key: "sent", label: "Verzonden" },
    { key: "rejected", label: "Afgewezen" },
  ];

  const filtered = statusFilter === "all" ? companies : companies.filter((c) => c.status === statusFilter);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const metrics = {
    today: companies.filter((c) => new Date(c.scraped_at) >= today).length,
    qualified: companies.filter((c) => (c.ai_score ?? 0) >= 7).length,
    emailReady: companies.filter((c) => c.status === "email_ready").length,
    sent: companies.filter((c) => c.status === "sent").length,
  };

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  }

  async function bulkAction(action: "approve" | "reject") {
    setBulkLoading(true);
    const ids = Array.from(selected);
    const status = action === "approve" ? "qualified" : "rejected";
    await fetch("/api/kvk/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    setSelected(new Set());
    await fetchData();
    setBulkLoading(false);
  }

  async function bulkDelete() {
    setBulkLoading(true);
    const ids = Array.from(selected);
    await fetch("/api/kvk/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setSelected(new Set());
    await fetchData();
    setBulkLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">KVK Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Bedrijven uit het KVK register</p>
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
            href="/kvk/settings"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={14} />
            Instellingen
          </Link>
        </div>
      </div>

      {/* Scrape result */}
      {scrapeResult && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs w-fit ${
          scrapeResult.error
            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            : "bg-[#C7F56F]/10 text-[#3a6600] dark:text-[#C7F56F] border border-[#C7F56F]/30"
        }`}>
          {scrapeResult.error ? `Fout: ${scrapeResult.error}` : (
            <div className="flex flex-col gap-1">
              <span>{scrapeResult.inserted} nieuw van {scrapeResult.scraped} gevonden ({scrapeResult.queries} zoekopdrachten)</span>
              {scrapeResult.errors?.map((e, i) => <span key={i} className="text-orange-600 dark:text-orange-400">{e}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Next scrape indicator */}
      {countdownLabel && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Clock size={12} />
          Volgende automatische scrape: {countdownLabel}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Vandaag", value: loading ? "—" : metrics.today, icon: Building2, accent: true },
          { label: "Gekwalificeerd", value: loading ? "—" : metrics.qualified, icon: Zap },
          { label: "Email klaar", value: loading ? "—" : metrics.emailReady, icon: Mail },
          { label: "Verzonden", value: loading ? "—" : metrics.sent, icon: Send },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl border p-5 flex flex-col gap-2 ${m.accent ? "border-[#C7F56F]/40 bg-[#C7F56F]/5" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{m.label}</span>
              <m.icon size={14} className={m.accent ? "text-[#3a6600] dark:text-[#C7F56F]" : "text-gray-400"} />
            </div>
            <span className={`text-3xl font-bold tabular-nums ${m.accent ? "text-[#3a6600] dark:text-[#C7F56F]" : "text-gray-900 dark:text-white"}`}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setSelected(new Set()); }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-[#C7F56F] text-[#1a1a1a]"
                : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">
              {tab.key === "all" ? companies.length : companies.filter((c) => c.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">{selected.size} geselecteerd</span>
          {statusFilter === "rejected" ? (
            <button
              onClick={bulkDelete}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Verwijderen
            </button>
          ) : (
            <>
              <button
                onClick={() => bulkAction("approve")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F]/10 border border-[#C7F56F]/30 px-3 py-1.5 text-xs font-medium text-[#3a6600] dark:text-[#C7F56F] hover:bg-[#C7F56F]/20 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={12} />
                Kwalificeren
              </button>
              <button
                onClick={() => bulkAction("reject")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircle size={12} />
                Afwijzen
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-xs text-blue-600 dark:text-blue-400">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Laden…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center m-1">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {companies.length === 0 ? "Geen bedrijven gevonden. Klik op 'Scrapen' om te starten." : "Geen bedrijven in dit filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded accent-[#C7F56F]" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bedrijf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Stad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Rechtsvorm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">SBI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Email</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((company) => (
                  <tr
                    key={company.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                      selected.has(company.id) && "bg-[#C7F56F]/5 dark:bg-[#C7F56F]/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(company.id)} onChange={() => toggleRow(company.id)} className="rounded accent-[#C7F56F]" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                      {company.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {company.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {company.legal_form ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {company.sbi_codes?.[0] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={company.ai_score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={company.status as string} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {company.contact_email ? (
                        <Mail size={14} className="inline text-[#C7F56F]" />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/kvk/${company.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-[#C7F56F] transition-all"
                      >
                        <ExternalLink size={11} />
                        Bekijk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} van {companies.length} bedrijven
      </p>
    </div>
  );
}
