"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Search, Mail, ExternalLink, CheckCircle2, XCircle, Zap, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Lead, LeadStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";

type SortField = "scraped_at" | "ai_score" | "company";
type SortDir = "asc" | "desc";
type ScoreFilter = "all" | "hot" | "warm" | "cold";

const STATUS_TABS: { key: "all" | LeadStatus; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "new", label: "Nieuw" },
  { key: "qualified", label: "Gekwalificeerd" },
  { key: "email_ready", label: "Email klaar" },
  { key: "sent", label: "Verzonden" },
  { key: "rejected", label: "Afgewezen" },
];

interface LeadsTableProps {
  leads: Lead[];
  onRefresh?: () => void;
}

export default function LeadsTable({ leads, onRefresh }: LeadsTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("scraped_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = [...leads];

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (scoreFilter === "hot") result = result.filter((l) => (l.ai_score ?? 0) >= 7);
    if (scoreFilter === "warm") result = result.filter((l) => (l.ai_score ?? 0) >= 4 && (l.ai_score ?? 0) < 7);
    if (scoreFilter === "cold") result = result.filter((l) => (l.ai_score ?? 11) < 4);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.company?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          l.location?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      if (sortField === "ai_score") {
        aVal = a.ai_score;
        bVal = b.ai_score;
      } else if (sortField === "company") {
        aVal = a.company ?? "";
        bVal = b.company ?? "";
      } else {
        aVal = a.scraped_at;
        bVal = b.scraped_at;
      }
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [leads, statusFilter, scoreFilter, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await fetch("/api/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelected(new Set());
      onRefresh?.();
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkAction(action: "approve" | "reject" | "approve_hot" | "reject_cold") {
    setBulkLoading(true);
    try {
      let ids: string[] = [];
      if (action === "approve_hot") {
        ids = filtered.filter((l) => (l.ai_score ?? 0) >= 7).map((l) => l.id);
      } else if (action === "reject_cold") {
        ids = filtered.filter((l) => (l.ai_score ?? 11) < 5).map((l) => l.id);
      } else {
        ids = Array.from(selected);
      }

      if (ids.length === 0) return;

      const status = action === "approve" || action === "approve_hot" ? "qualified" : "rejected";
      await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      setSelected(new Set());
      onRefresh?.();
    } finally {
      setBulkLoading(false);
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300 dark:text-gray-600" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-[#C7F56F]" />
      : <ChevronDown size={12} className="text-[#C7F56F]" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === tab.key
                  ? "bg-[#C7F56F] text-[#1a1a1a]"
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          {/* Score filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#C7F56F] cursor-pointer"
          >
            <option value="all">Alle scores</option>
            <option value="hot">Hot (≥7)</option>
            <option value="warm">Warm (4-6)</option>
            <option value="cold">Cold (&lt;4)</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek bedrijf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs outline-none focus:border-[#C7F56F] focus:ring-2 focus:ring-[#C7F56F]/30 w-44"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {(selected.size > 0 || true) && (
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400">{selected.size} geselecteerd</span>
              {statusFilter === "rejected" ? (
                <button
                  onClick={bulkDelete}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Afwijzen
                  </button>
                </>
              )}
            </>
          )}
          <button
            onClick={() => bulkAction("approve_hot")}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Zap size={12} className="text-[#C7F56F]" />
            Alles ≥7 kwalificeren
          </button>
          <button
            onClick={() => bulkAction("reject_cold")}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <XCircle size={12} className="text-red-400" />
            Alles &lt;5 afwijzen
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center m-1">
            <p className="text-gray-400 dark:text-gray-500 text-sm">Geen leads gevonden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded accent-[#C7F56F]"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer select-none"
                    onClick={() => toggleSort("company")}
                  >
                    <span className="flex items-center gap-1">Bedrijf <SortIcon field="company" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Functie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Locatie
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer select-none"
                    onClick={() => toggleSort("ai_score")}
                  >
                    <span className="flex items-center gap-1">Score <SortIcon field="ai_score" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Email
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer select-none"
                    onClick={() => toggleSort("scraped_at")}
                  >
                    <span className="flex items-center gap-1">Datum <SortIcon field="scraped_at" /></span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                      selected.has(lead.id) && "bg-[#C7F56F]/5 dark:bg-[#C7F56F]/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleRow(lead.id)}
                        className="rounded accent-[#C7F56F]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {lead.company ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">
                      {lead.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs">
                      {lead.location ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.ai_score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.contact_email ? (
                        <Mail size={14} className="inline text-[#C7F56F]" />
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {lead.scraped_at
                        ? formatDistanceToNow(new Date(lead.scraped_at), {
                            addSuffix: true,
                            locale: nl,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/leads/${lead.id}`)}
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
        {filtered.length} van {leads.length} leads
      </p>
    </div>
  );
}
