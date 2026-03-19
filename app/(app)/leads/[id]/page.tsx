"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Lead, LeadStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import EmailPreview from "@/components/EmailPreview";

const STATUS_OPTIONS: LeadStatus[] = ["new", "qualified", "email_ready", "sent", "rejected"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nieuw",
  qualified: "Gekwalificeerd",
  email_ready: "Email klaar",
  sent: "Verzonden",
  rejected: "Afgewezen",
  bounced_hard: "Hard bounce",
  bounced_soft: "Soft bounce",
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/leads/${id}`);
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    setLead(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setLead({ ...lead, status });
  }

  async function handleQualify() {
    setQualifying(true);
    try {
      const res = await fetch(`/api/leads/${id}/qualify`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
      }
    } finally {
      setQualifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!lead) return null;

  const tierLabel = { hot: "🔥 Hot", warm: "🌤 Warm", cold: "❄️ Cold" }[lead.ai_tier ?? "cold"] ?? "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={14} />
          Terug
        </button>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-xs">
          {lead.company}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Header card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {lead.company}
                </h1>
                <p className="mt-0.5 text-base text-gray-600 dark:text-gray-400">
                  {lead.title}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ScoreBadge score={lead.ai_score} />
                {lead.ai_tier && (
                  <span className="text-sm">{tierLabel}</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              {lead.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {lead.location}
                </span>
              )}
              {lead.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign size={12} /> {lead.salary}
                </span>
              )}
              {lead.scraped_at && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDistanceToNow(new Date(lead.scraped_at), { addSuffix: true, locale: nl })}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <StatusBadge status={lead.status} />
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 text-xs outline-none focus:border-[#C7F56F] cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {lead.url && (
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:border-[#C7F56F] transition-colors"
                >
                  <ExternalLink size={11} />
                  Indeed
                </a>
              )}
            </div>
          </div>

          {/* AI Analysis card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                AI Analyse
              </h2>
              <button
                onClick={handleQualify}
                disabled={qualifying}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
              >
                {qualifying ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Zap size={11} />
                )}
                {lead.ai_score ? "Opnieuw kwalificeren" : "Kwalificeren"}
              </button>
            </div>

            {lead.ai_score ? (
              <div className="flex flex-col gap-4">
                {lead.ai_reasoning && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Redenering</p>
                    <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">
                      {lead.ai_reasoning}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {lead.ai_key_selling_point && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Key selling point</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{lead.ai_key_selling_point}</p>
                    </div>
                  )}
                  {lead.ai_monthly_cost_est && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Geschatte besparing</p>
                      <p className="text-sm font-semibold text-[#3a6600] dark:text-[#C7F56F]">{lead.ai_monthly_cost_est}</p>
                    </div>
                  )}
                  {lead.ai_company_size && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Bedrijfsgrootte</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{lead.ai_company_size}</p>
                    </div>
                  )}
                  {lead.ai_best_flow && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Beste product</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{lead.ai_best_flow}</p>
                    </div>
                  )}
                  {lead.sequenceflow_pitch && (
                    <div className="col-span-2">
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Pitch</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{lead.sequenceflow_pitch}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nog niet gekwalificeerd. Klik op &ldquo;Kwalificeren&rdquo; om te starten.
                </p>
              </div>
            )}
          </div>

          {/* Job description */}
          {lead.description && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Vacaturebeschrijving
                </h2>
                {descExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </button>
              {descExpanded && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {lead.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <EmailPreview
            lead={lead}
            onUpdate={(updated) => setLead((prev) => prev ? { ...prev, ...updated } : prev)}
          />

          {/* Metadata */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Metadata
            </h2>
            <dl className="flex flex-col gap-2 text-xs">
              {[
                { label: "Job ID", value: lead.job_id },
                { label: "Zoekopdracht", value: lead.search_label },
                { label: "Flow", value: lead.sequenceflow_flow },
                { label: "Angle", value: lead.sequenceflow_angle },
                { label: "Gekwalificeerd op", value: lead.qualified_at ? new Date(lead.qualified_at).toLocaleDateString("nl-NL") : null },
                { label: "Verzonden op", value: lead.email_sent_at ? new Date(lead.email_sent_at).toLocaleDateString("nl-NL") : null },
              ]
                .filter((item) => item.value)
                .map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">{label}</dt>
                    <dd className="text-gray-700 dark:text-gray-300 font-medium text-right truncate max-w-[180px]">{value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
