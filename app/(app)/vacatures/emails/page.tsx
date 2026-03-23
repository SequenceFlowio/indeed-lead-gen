"use client";

import { useEffect, useState, useCallback } from "react";
import { Send, Loader2, RefreshCw, ExternalLink, Mail } from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "qualified" | "email_ready" | "sent";

export default function EmailsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("email_ready");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ sent?: number; failed?: number; generated?: number; errors?: { company: string; error: string }[] } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data: Lead[] = await res.json();
        setLeads(data.filter((l) => l.status === "qualified" || l.status === "email_ready" || l.status === "sent"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelected(new Set());
    setBulkResult(null);
  }, [tab]);

  const filtered = leads.filter((l) => l.status === tab);
  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.add(l.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendOne(lead: Lead) {
    setSending((prev) => new Set(prev).add(lead.id));
    const res = await fetch(`/api/leads/${lead.id}/send`, { method: "POST" });
    if (res.ok) {
      await fetchLeads();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
    setSending((prev) => {
      const next = new Set(prev);
      next.delete(lead.id);
      return next;
    });
  }

  async function sendBulk() {
    const ids = Array.from(selected).filter((id) => leads.find((l) => l.id === id)?.status === "email_ready");
    if (ids.length === 0) return;
    setBulkSending(true);
    setBulkResult(null);
    const res = await fetch("/api/emails/send-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const data = await res.json();
      setBulkResult(data);
      await fetchLeads();
      setSelected(new Set());
    }
    setBulkSending(false);
  }

  async function generateBulk() {
    const ids = Array.from(selected).filter((id) => leads.find((l) => l.id === id)?.status === "qualified");
    if (ids.length === 0) return;
    setBulkGenerating(true);
    setBulkResult(null);
    const res = await fetch("/api/emails/generate-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const data = await res.json();
      setBulkResult({ generated: data.generated, failed: data.failed, errors: data.errors });
      await fetchLeads();
      setSelected(new Set());
    }
    setBulkGenerating(false);
  }

  const selectedInTab = filtered.filter((l) => selected.has(l.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">E-mails</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Beheer en verstuur e-mails naar gekwalificeerde leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Vernieuwen
          </button>
          {tab === "qualified" && (
            <button
              onClick={generateBulk}
              disabled={bulkGenerating || selectedInTab === 0}
              className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
            >
              {bulkGenerating ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {bulkGenerating ? "Genereren…" : selectedInTab > 0 ? `Genereer geselecteerde (${selectedInTab})` : "Genereer alles"}
            </button>
          )}
          {tab === "email_ready" && (
            <button
              onClick={sendBulk}
              disabled={bulkSending || selectedInTab === 0}
              className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-4 py-2 text-sm font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
            >
              {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {bulkSending ? "Versturen…" : selectedInTab > 0 ? `Stuur geselecteerde (${selectedInTab})` : "Alles versturen"}
            </button>
          )}
        </div>
      </div>

      {/* Bulk result feedback */}
      {bulkResult && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          (bulkResult.failed ?? 0) > 0
            ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
            : "border-[#C7F56F]/30 bg-[#C7F56F]/10 text-[#3a6600] dark:text-[#C7F56F]"
        }`}>
          <div>
            {bulkResult.sent != null && <strong>{bulkResult.sent} verzonden</strong>}
            {bulkResult.generated != null && <strong>{bulkResult.generated} gegenereerd</strong>}
            {(bulkResult.failed ?? 0) > 0 && `, ${bulkResult.failed} mislukt`}
            {bulkResult.errors && bulkResult.errors.length > 0 && (
              <ul className="mt-1 text-xs opacity-80">
                {bulkResult.errors.map((e, i) => (
                  <li key={i}>{e.company}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 w-fit">
        {([["qualified", "Gekwalificeerd"], ["email_ready", "Klaar"], ["sent", "Verzonden"]] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {label}
            <span className={cn(
              "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
              tab === value
                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500"
            )}>
              {leads.filter((l) => l.status === value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {tab === "qualified"
                ? "Geen gekwalificeerde leads. Kwalificeer leads op het dashboard."
                : tab === "email_ready"
                ? "Geen e-mails klaar. Genereer e-mails voor gekwalificeerde leads."
                : "Nog geen e-mails verzonden."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {(tab === "email_ready" || tab === "qualified") && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-gray-600 accent-[#C7F56F]"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Bedrijf</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Aan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Onderwerp</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((lead) => {
                const isSending = sending.has(lead.id);
                return (
                  <tr key={lead.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors", selected.has(lead.id) && "bg-[#C7F56F]/5")}>
                    {(tab === "email_ready" || tab === "qualified") && (
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                          className="rounded border-gray-300 dark:border-gray-600 accent-[#C7F56F]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-xs text-gray-900 dark:text-white max-w-[160px] truncate">
                      {lead.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
                      {lead.contact_email ?? "—"}
                      {lead.email_confidence && (
                        <span className="ml-1 text-gray-400 dark:text-gray-500">({lead.email_confidence}%)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[240px] truncate">
                      {lead.draft_subject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.ai_score != null ? (
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          lead.ai_score >= 8 ? "bg-[#C7F56F]/20 text-[#3a6600] dark:text-[#C7F56F]" :
                          lead.ai_score >= 6 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                          "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        )}>
                          {lead.ai_score}/10
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/vacatures/leads/${lead.id}`}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <ExternalLink size={11} />
                          Bekijk
                        </Link>
                        {tab === "email_ready" && (
                          <button
                            onClick={() => sendOne(lead)}
                            disabled={isSending}
                            className="flex items-center gap-1 rounded-lg bg-[#C7F56F] px-2.5 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
                          >
                            {isSending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            Stuur
                          </button>
                        )}
                        {tab === "qualified" && (
                          <button
                            onClick={async () => {
                              setSending((prev) => new Set(prev).add(lead.id));
                              await fetch("/api/emails/generate-bulk", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ids: [lead.id] }),
                              });
                              await fetchLeads();
                              setSending((prev) => { const n = new Set(prev); n.delete(lead.id); return n; });
                            }}
                            disabled={sending.has(lead.id)}
                            className="flex items-center gap-1 rounded-lg bg-[#C7F56F] px-2.5 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
                          >
                            {sending.has(lead.id) ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                            Genereer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
