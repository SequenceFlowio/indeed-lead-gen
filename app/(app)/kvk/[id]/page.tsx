"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Building2, Loader2, Zap, ChevronDown, ChevronUp, Send, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { KVKCompany } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";

export default function KVKCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<KVKCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    const res = await fetch(`/api/kvk/companies/${id}`);
    if (!res.ok) { router.push("/kvk"); return; }
    setCompany(await res.json());
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  async function handleQualify() {
    setQualifying(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/kvk/companies/${id}/qualify`, { method: "POST" });
      if (res.ok) setCompany(await res.json());
      else setActionError((await res.json()).error ?? "Kwalificeren mislukt");
    } finally {
      setQualifying(false);
    }
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/kvk/companies/${id}/email`, { method: "POST" });
      if (res.ok) setCompany(await res.json());
      else setActionError((await res.json()).error ?? "Genereren mislukt");
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/kvk/companies/${id}/send`, { method: "POST" });
      if (res.ok) setCompany(await res.json());
      else setActionError((await res.json()).error ?? "Versturen mislukt");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: string) {
    const res = await fetch(`/api/kvk/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setCompany(await res.json());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!company) return null;

  const tierLabel = { hot: "🔥 Hot", warm: "🌤 Warm", cold: "❄️ Cold" }[company.ai_tier ?? "cold"] ?? "—";

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
        <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-xs">{company.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Header card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{company.name}</h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{company.legal_form ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ScoreBadge score={company.ai_score} />
                {company.ai_tier && <span className="text-sm">{tierLabel}</span>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              {company.city && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {company.city}{company.province ? `, ${company.province}` : ""}</span>
              )}
              {company.registration_date && (
                <span className="flex items-center gap-1"><Calendar size={12} /> Opgericht {new Date(company.registration_date).toLocaleDateString("nl-NL")}</span>
              )}
              {company.kvk_number && (
                <span className="flex items-center gap-1"><Building2 size={12} /> KVK {company.kvk_number}</span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <StatusBadge status={company.status as string} />
              {company.status === "rejected" && (
                <button onClick={() => handleStatusChange("new")} className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Herstellen
                </button>
              )}
              {(company.status === "new" || company.status === "qualified") && (
                <button onClick={() => handleStatusChange("rejected")} className="rounded-lg border border-red-200 dark:border-red-800 px-2.5 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Afwijzen
                </button>
              )}
            </div>
            {actionError && <p className="mt-2 text-xs text-red-500">{actionError}</p>}
          </div>

          {/* AI Analysis */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">AI Analyse</h2>
              <button
                onClick={handleQualify}
                disabled={qualifying}
                className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
              >
                {qualifying ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {company.ai_score ? "Opnieuw kwalificeren" : "Kwalificeren"}
              </button>
            </div>

            {company.ai_score ? (
              <div className="flex flex-col gap-4">
                {company.ai_reasoning && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Redenering</p>
                    <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed">{company.ai_reasoning}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {company.ai_key_selling_point && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Key selling point</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{company.ai_key_selling_point}</p>
                    </div>
                  )}
                  {company.ai_monthly_cost_est && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Geschatte besparing</p>
                      <p className="text-sm font-semibold text-[#3a6600] dark:text-[#C7F56F]">{company.ai_monthly_cost_est}</p>
                    </div>
                  )}
                  {company.ai_company_size && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Bedrijfsgrootte</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{company.ai_company_size}</p>
                    </div>
                  )}
                  {company.ai_best_flow && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Beste product</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{company.ai_best_flow}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">Nog niet gekwalificeerd.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Email card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">E-mail</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateEmail}
                  disabled={generatingEmail || !company.ai_score}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {generatingEmail ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  {company.draft_email ? "Opnieuw" : "Genereer"}
                </button>
                {company.draft_email && company.contact_email && company.status === "email_ready" && (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex items-center gap-1.5 rounded-lg bg-[#C7F56F] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#b8e85e] transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    Verstuur
                  </button>
                )}
              </div>
            </div>

            {company.draft_email ? (
              <div className="flex flex-col gap-3">
                {company.contact_email && (
                  <div>
                    <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Aan</p>
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{company.contact_email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Betrouwbaarheid: {company.email_confidence ?? "—"}</p>
                  </div>
                )}
                {company.draft_subject && (
                  <div>
                    <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Onderwerp</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{company.draft_subject}</p>
                  </div>
                )}
                <div>
                  <button
                    onClick={() => setEmailExpanded((v) => !v)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-1"
                  >
                    {emailExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {emailExpanded ? "Verberg" : "Toon e-mailtekst"}
                  </button>
                  {emailExpanded && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      {company.draft_email}
                    </p>
                  )}
                </div>
                {company.email_sent_at && (
                  <p className="text-xs text-[#3a6600] dark:text-[#C7F56F]">
                    Verzonden {formatDistanceToNow(new Date(company.email_sent_at), { addSuffix: true, locale: nl })}
                    {company.sent_from_email ? ` via ${company.sent_from_email}` : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">Kwalificeer eerst, genereer dan een e-mail.</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Metadata</h2>
            <dl className="flex flex-col gap-2 text-xs">
              {[
                { label: "KVK nummer", value: company.kvk_number },
                { label: "Rechtsvorm", value: company.legal_form },
                { label: "SBI codes", value: company.sbi_codes?.join(", ") ?? null },
                { label: "Postcode", value: company.postal_code },
                { label: "Straat", value: company.street },
                { label: "Oprichtingsdatum", value: company.registration_date ? new Date(company.registration_date).toLocaleDateString("nl-NL") : null },
                { label: "Gekwalificeerd op", value: company.qualified_at ? new Date(company.qualified_at).toLocaleDateString("nl-NL") : null },
                { label: "Verzonden op", value: company.email_sent_at ? new Date(company.email_sent_at).toLocaleDateString("nl-NL") : null },
                { label: "Scraped", value: company.scraped_at ? formatDistanceToNow(new Date(company.scraped_at), { addSuffix: true, locale: nl }) : null },
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
